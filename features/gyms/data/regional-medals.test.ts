import assert from "node:assert/strict";
import { test } from "node:test";

import type { RegionId } from "@/shared/types/region";
import { getRegionalMedalImageUrl } from "./gym-badge-images.ts";
import { REGIONAL_MEDAL_DEFINITIONS, getRegionalMedalDefinition } from "./regional-medals.ts";

const EXPECTED_REGION_IDS: RegionId[] = ["kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar", "paldea"];

test("exactly 9 Regional Medal definitions exist, one per region", () => {
  assert.equal(REGIONAL_MEDAL_DEFINITIONS.length, 9);
  assert.deepEqual(
    REGIONAL_MEDAL_DEFINITIONS.map((m) => m.regionId).sort(),
    [...EXPECTED_REGION_IDS].sort()
  );
});

// GYM BADGES / MEDALS — SIMPLE NUMERIC IMAGE ARCHITECTURE (later task) —
// one shared flat folder, 1.png..9.png in region-progression order, via
// the one deterministic getRegionalMedalImageUrl helper.
test("each medal's image path follows /images/gyms/medals/<n>.png, n derived from getRegionalMedalImageUrl", () => {
  for (const medal of REGIONAL_MEDAL_DEFINITIONS) {
    assert.equal(medal.id, `${medal.regionId}-medal`);
    assert.equal(medal.imageUrl, getRegionalMedalImageUrl(medal.regionId));
    assert.match(medal.imageUrl, /^\/images\/gyms\/medals\/\d+\.png$/);
  }
});

test("medal numbering runs 1-9 in region-progression order (Kanto=1 ... Paldea=9)", () => {
  assert.equal(getRegionalMedalImageUrl("kanto"), "/images/gyms/medals/1.png");
  assert.equal(getRegionalMedalImageUrl("johto"), "/images/gyms/medals/2.png");
  assert.equal(getRegionalMedalImageUrl("hoenn"), "/images/gyms/medals/3.png");
  assert.equal(getRegionalMedalImageUrl("sinnoh"), "/images/gyms/medals/4.png");
  assert.equal(getRegionalMedalImageUrl("unova"), "/images/gyms/medals/5.png");
  assert.equal(getRegionalMedalImageUrl("kalos"), "/images/gyms/medals/6.png");
  assert.equal(getRegionalMedalImageUrl("alola"), "/images/gyms/medals/7.png");
  assert.equal(getRegionalMedalImageUrl("galar"), "/images/gyms/medals/8.png");
  assert.equal(getRegionalMedalImageUrl("paldea"), "/images/gyms/medals/9.png");

  const allNumbers = REGIONAL_MEDAL_DEFINITIONS.map((m) => Number(m.imageUrl.match(/(\d+)\.png$/)![1])).sort((a, b) => a - b);
  assert.deepEqual(allNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9], "medal numbers must be exactly 1..9, each used once");
});

test("getRegionalMedalDefinition returns the matching catalog entry", () => {
  const medal = getRegionalMedalDefinition("paldea");
  assert.equal(medal.id, "paldea-medal");
  assert.equal(medal.displayName, "Paldea Regional Medal");
});
