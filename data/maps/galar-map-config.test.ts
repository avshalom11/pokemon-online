import assert from "node:assert/strict";
import { test } from "node:test";

import { GALAR_MAP_CONFIG } from "./galar-map-config.ts";
import { ALL_ZONE_IDS, type ZoneId } from "../../shared/types/zone.ts";
import { getRegionDefinition } from "../../features/regions/data/region-registry.ts";

// No prior region (Kanto/Johto/Hoenn/Sinnoh/Unova/Kalos/Alola) has a
// dedicated *-map-config.test.ts file — geometry has always been verified
// via scripts/validate-map-regions.mjs instead (see this file's own header
// comment for that run's results). This file is deliberately narrow: it
// only asserts the concrete structural properties Galar Phase 5 requires
// (image path, verified dimensions, exactly the 5 approved zones, no
// Beach, valid bounds, the approved percentage geometry preserved through
// conversion), never a general-purpose map-config test harness for every
// region — that would be a bigger, out-of-scope change this phase doesn't
// call for.

const EXPECTED_ZONE_IDS: ZoneId[] = ["grassland", "water", "cave", "lava", "haunted-house"];

// The exact percentage polygons approved by the user for Galar Phase 5 —
// copied verbatim from the phase spec, never altered. Used below to
// recompute the expected pixel conversion and confirm it matches
// GALAR_MAP_CONFIG exactly, except for the one documented single-point
// nudge (lava's 13th point) that resolved a real cross-zone edge crossing
// — see galar-map-config.ts's own header comment for the full rationale.
const APPROVED_PERCENT_POINTS: Record<string, string> = {
  grassland: "46,27 35,37 30,45 28,53 29,59 35,64 36,71 30,88 28,92 11,89 10,83 6,79 4,69 3,61 3,52 5,42 12,31 26,23 36,26",
  water: "52,98 61,98 66,93 73,90 80,86 86,82 91,72 94,64 95,57 93,49 88,41 83,35 75,32 69,29 64,29 60,27 52,28 46,26 41,25 36,25 31,22 25,22 20,24 16,27 11,30 6,37 4,44 1,51 2,56 2,63 3,68 2,73 5,83 9,88 14,91 30,94 29,100 0,99 1,1 55,1 90,2 99,0 99,100 42,100 34,99 30,97",
  cave: "32,90 34,79 37,72 40,66 42,68 45,63 49,68 54,65 57,68 58,66 70,76 75,86 66,92 57,96 38,96",
  lava: "45,28 39,34 35,40 31,47 31,56 35,62 39,65 43,66 45,62 50,65 54,63 56,65 63,57 64,48 66,38 64,31 53,29",
  "haunted-house": "65,32 67,38 66,43 65,47 63,56 61,64 65,69 73,78 78,82 83,81 90,69 93,60 92,52 89,45 83,38 75,34",
};

// The one approved adjustment documented in galar-map-config.ts's own
// header comment — lava's 13th point (index 12), nudged from its raw
// converted (883,640) to (880,637) to clear a real cross-zone edge
// crossing against haunted-house's shared boundary corner.
const APPROVED_ADJUSTMENTS: Record<string, Record<number, string>> = {
  lava: { 12: "880,637" },
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

test("Galar map image is /images/galar-map.png", () => {
  assert.equal(GALAR_MAP_CONFIG.imageSrc, "/images/galar-map.png");
});

test("Galar viewBox matches galar-map.png's real verified pixel dimensions (Galar Phase 4: 1402x1122)", () => {
  assert.equal(GALAR_MAP_CONFIG.viewBox.width, 1402);
  assert.equal(GALAR_MAP_CONFIG.viewBox.height, 1122);
});

test("exactly 5 Galar regions exist", () => {
  assert.equal(GALAR_MAP_CONFIG.regions.length, 5);
});

test("Galar's zone ids are exactly the 5 approved zones, in the approved order, and Beach is absent", () => {
  const zoneIds = GALAR_MAP_CONFIG.regions.map((region) => region.zoneId);
  assert.deepEqual(zoneIds, EXPECTED_ZONE_IDS);
  assert.ok(!zoneIds.includes("beach"), "Galar must never include a beach polygon");
});

test("every Galar polygon has at least 3 points and a non-empty points string", () => {
  for (const region of GALAR_MAP_CONFIG.regions) {
    assert.ok(region.points.trim().length > 0, `${region.zoneId} must have a non-empty points string`);
    const points = parsePoints(region.points);
    assert.ok(points.length >= 3, `${region.zoneId} must have at least 3 points, found ${points.length}`);
  }
});

test("every Galar point is within the valid 0..1402 / 0..1122 map bounds", () => {
  for (const region of GALAR_MAP_CONFIG.regions) {
    for (const [x, y] of parsePoints(region.points)) {
      assert.ok(x >= 0 && x <= GALAR_MAP_CONFIG.viewBox.width, `${region.zoneId} has out-of-bounds x=${x}`);
      assert.ok(y >= 0 && y <= GALAR_MAP_CONFIG.viewBox.height, `${region.zoneId} has out-of-bounds y=${y}`);
    }
  }
});

test("the approved percentage geometry was preserved through conversion, except the one documented single-point nudge", () => {
  const { width, height } = GALAR_MAP_CONFIG.viewBox;

  for (const region of GALAR_MAP_CONFIG.regions) {
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

test("the global ZoneId union is unaffected — beach still exists for other regions", () => {
  assert.ok(ALL_ZONE_IDS.includes("beach"), "beach must remain a valid ZoneId for other regions");
  assert.equal(ALL_ZONE_IDS.length, 6);
});

test("Galar resolves through the generic production map resolver: hasMap is true and mapConfig is GALAR_MAP_CONFIG", () => {
  const galar = getRegionDefinition("galar");
  assert.equal(galar.hasMap, true);
  assert.equal(galar.mapConfig, GALAR_MAP_CONFIG);
  assert.equal(galar.mapConfig?.imageSrc, "/images/galar-map.png");
});
