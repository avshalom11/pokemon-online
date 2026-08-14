import assert from "node:assert/strict";
import { test } from "node:test";

import { PALDEA_MAP_CONFIG } from "./paldea-map-config.ts";
import { ALL_ZONE_IDS, type ZoneId } from "../../shared/types/zone.ts";
import { getRegionDefinition } from "../../features/regions/data/region-registry.ts";

// Same "no general-purpose map-config test harness" scope Galar Phase 5's
// own galar-map-config.test.ts established — geometry is otherwise verified
// via scripts/validate-map-regions.mjs (see paldea-map-config.ts's own
// header comment for that run's results). This file is deliberately narrow:
// it only asserts the concrete structural properties Paldea Phase 5
// requires (image path, verified dimensions, exactly the 6 approved zones
// INCLUDING Beach, valid bounds, the approved percentage geometry preserved
// through conversion), never a general-purpose test harness for every
// region.

const EXPECTED_ZONE_IDS: ZoneId[] = ["grassland", "water", "cave", "lava", "haunted-house", "beach"];

// The exact percentage polygons approved by the user for Paldea Phase 5 —
// copied verbatim from the phase spec, never altered. Used below to
// recompute the expected pixel conversion and confirm it matches
// PALDEA_MAP_CONFIG exactly, except for the two documented single-point
// nudges (grassland's 2nd and 7th points) that resolved real cross-zone
// edge crossings — see paldea-map-config.ts's own header comment for the
// full rationale.
const APPROVED_PERCENT_POINTS: Record<string, string> = {
  grassland: "27,22 17,26 13,34 15,40 12,49 6,56 5,64 11,58 19,59 28,63 26,54 27,48 28,44 31,38 35,32",
  water: "4,86 0,99 99,99 97,80 81,94 67,94 55,86 49,78 52,71 62,66 68,55 69,45 57,39 48,33 47,29 52,23 57,15 61,8 64,0 49,1 32,2 27,1 26,14 28,20 32,24 33,28 37,30 39,35 36,38 33,44 31,50 29,57 32,61 36,63 41,68 46,71 48,76 47,81 44,87 39,92 30,95 20,96 11,93 6,89",
  cave: "4,62 6,66 5,71 5,76 5,84 12,90 19,92 31,91 37,88 42,82 45,74 35,68 27,65 15,62 12,60",
  lava: "65,8 61,14 57,18 52,28 50,30 61,35 68,38 73,42 81,39 87,37 90,40 94,34 97,27 95,19 92,14 87,9",
  "haunted-house": "72,44 73,52 68,58 67,63 63,69 56,73 52,76 57,85 67,91 76,92 86,87 92,81 96,72 95,53 96,43 85,38",
  beach: "24,23 14,31 11,36 14,43 4,56 1,56 0,1 14,1",
};

// The two approved adjustments documented in paldea-map-config.ts's own
// header comment — grassland's 2nd point (index 1), nudged from its raw
// converted (238,292) to (252,312) to clear a real cross-zone edge crossing
// against beach's shared boundary; and grassland's 7th point (index 6),
// nudged from its raw converted (70,718) to (65,694) to clear a real
// cross-zone edge crossing against cave's shared boundary corner.
const APPROVED_ADJUSTMENTS: Record<string, Record<number, string>> = {
  grassland: { 1: "252,312", 6: "65,694" },
};

function parsePoints(pointsAttribute: string): [number, number][] {
  return pointsAttribute
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return [x!, y!];
    });
}

function convertPercentToPixel(percentPointsAttribute: string, width: number, height: number): string {
  return parsePoints(percentPointsAttribute)
    .map(([px, py]) => `${Math.round((px / 100) * width)},${Math.round((py / 100) * height)}`)
    .join(" ");
}

test("Paldea map image is /images/paldea-map.png", () => {
  assert.equal(PALDEA_MAP_CONFIG.imageSrc, "/images/paldea-map.png");
});

test("Paldea viewBox matches paldea-map.png's real verified pixel dimensions (Paldea Phase 4: 1402x1122)", () => {
  assert.equal(PALDEA_MAP_CONFIG.viewBox.width, 1402);
  assert.equal(PALDEA_MAP_CONFIG.viewBox.height, 1122);
});

test("exactly 6 Paldea regions exist", () => {
  assert.equal(PALDEA_MAP_CONFIG.regions.length, 6);
});

test("Paldea's zone ids are exactly the 6 approved zones, in the approved order, and Beach IS present", () => {
  const zoneIds = PALDEA_MAP_CONFIG.regions.map((region) => region.zoneId);
  assert.deepEqual(zoneIds, EXPECTED_ZONE_IDS);
  assert.ok(zoneIds.includes("beach"), "Paldea must include a beach polygon, unlike Kalos/Alola/Galar");
});

test("every Paldea polygon has at least 3 points and a non-empty points string", () => {
  for (const region of PALDEA_MAP_CONFIG.regions) {
    assert.ok(region.points.trim().length > 0, `${region.zoneId} must have a non-empty points string`);
    const points = parsePoints(region.points);
    assert.ok(points.length >= 3, `${region.zoneId} must have at least 3 points, found ${points.length}`);
  }
});

test("every Paldea point is within the valid 0..1402 / 0..1122 map bounds", () => {
  for (const region of PALDEA_MAP_CONFIG.regions) {
    for (const [x, y] of parsePoints(region.points)) {
      assert.ok(x >= 0 && x <= PALDEA_MAP_CONFIG.viewBox.width, `${region.zoneId} has out-of-bounds x=${x}`);
      assert.ok(y >= 0 && y <= PALDEA_MAP_CONFIG.viewBox.height, `${region.zoneId} has out-of-bounds y=${y}`);
    }
  }
});

test("the approved percentage geometry was preserved through conversion, except the two documented single-point nudges", () => {
  const { width, height } = PALDEA_MAP_CONFIG.viewBox;

  for (const region of PALDEA_MAP_CONFIG.regions) {
    const approvedPercent = APPROVED_PERCENT_POINTS[region.zoneId];
    assert.ok(approvedPercent, `test assumption: an approved percentage polygon must exist for ${region.zoneId}`);

    const expectedPoints = parsePoints(convertPercentToPixel(approvedPercent!, width, height));
    const actualPoints = parsePoints(region.points);

    assert.equal(actualPoints.length, expectedPoints.length, `${region.zoneId} must have the same point count as the approved polygon`);

    const adjustments = APPROVED_ADJUSTMENTS[region.zoneId] ?? {};
    expectedPoints.forEach(([ex, ey], index) => {
      const [ax, ay] = actualPoints[index]!;
      const override = adjustments[index];
      if (override) {
        const [ox, oy] = override.split(",").map(Number);
        assert.deepEqual([ax, ay], [ox, oy], `${region.zoneId}[${index}] must equal its documented approved adjustment`);
      } else {
        assert.deepEqual([ax, ay], [ex, ey], `${region.zoneId}[${index}] must equal the approved point converted verbatim (no un-documented change)`);
      }
    });
  }
});

test("the global ZoneId union is unaffected — beach still exists for every region, and the union still has exactly 6 ids", () => {
  assert.ok(ALL_ZONE_IDS.includes("beach"), "beach must remain a valid ZoneId");
  assert.equal(ALL_ZONE_IDS.length, 6);
});

test("Paldea resolves through the generic production map resolver: hasMap is true and mapConfig is PALDEA_MAP_CONFIG", () => {
  const paldea = getRegionDefinition("paldea");
  assert.equal(paldea.hasMap, true);
  assert.equal(paldea.mapConfig, PALDEA_MAP_CONFIG);
  assert.equal(paldea.mapConfig?.imageSrc, "/images/paldea-map.png");
});
