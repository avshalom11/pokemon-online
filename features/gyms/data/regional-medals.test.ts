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

// REGIONAL MEDAL IMAGE PATH — FOCUSED FIX (later task) — Badges and Medals
// share ONE flat folder on disk (public/images/gyms/badges/), 4 numbered
// slots per region (3 Gym Badges + that region's own Medal as the 4th
// slot) — never a separate medals/ folder, via the one deterministic
// getRegionalMedalImageUrl helper.
test("each medal's image path follows /images/gyms/badges/<n>.png (the SAME shared folder Gym Badges use), n derived from getRegionalMedalImageUrl", () => {
  for (const medal of REGIONAL_MEDAL_DEFINITIONS) {
    assert.equal(medal.id, `${medal.regionId}-medal`);
    assert.equal(medal.imageUrl, getRegionalMedalImageUrl(medal.regionId));
    assert.match(medal.imageUrl, /^\/images\/gyms\/badges\/\d+\.png$/);
  }
});

test("medal numbering is the 4th slot in each region's own 4-slot block (Kanto=4, Johto=8, ... Paldea=36)", () => {
  assert.equal(getRegionalMedalImageUrl("kanto"), "/images/gyms/badges/4.png");
  assert.equal(getRegionalMedalImageUrl("johto"), "/images/gyms/badges/8.png");
  assert.equal(getRegionalMedalImageUrl("hoenn"), "/images/gyms/badges/12.png");
  assert.equal(getRegionalMedalImageUrl("sinnoh"), "/images/gyms/badges/16.png");
  assert.equal(getRegionalMedalImageUrl("unova"), "/images/gyms/badges/20.png");
  assert.equal(getRegionalMedalImageUrl("kalos"), "/images/gyms/badges/24.png");
  assert.equal(getRegionalMedalImageUrl("alola"), "/images/gyms/badges/28.png");
  assert.equal(getRegionalMedalImageUrl("galar"), "/images/gyms/badges/32.png");
  assert.equal(getRegionalMedalImageUrl("paldea"), "/images/gyms/badges/36.png");

  const allNumbers = REGIONAL_MEDAL_DEFINITIONS.map((m) => Number(m.imageUrl.match(/(\d+)\.png$/)![1])).sort((a, b) => a - b);
  assert.deepEqual(allNumbers, [4, 8, 12, 16, 20, 24, 28, 32, 36], "medal numbers must be exactly the 4th slot of each region's own 4-slot block, each used once");
});

test("getRegionalMedalDefinition returns the matching catalog entry", () => {
  const medal = getRegionalMedalDefinition("paldea");
  assert.equal(medal.id, "paldea-medal");
  assert.equal(medal.displayName, "Paldea Regional Medal");
});
