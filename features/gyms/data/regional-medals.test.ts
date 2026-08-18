import assert from "node:assert/strict";
import { test } from "node:test";

import type { RegionId } from "@/shared/types/region";
import { REGIONAL_MEDAL_DEFINITIONS, getRegionalMedalDefinition } from "./regional-medals.ts";

const EXPECTED_REGION_IDS: RegionId[] = ["kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar", "paldea"];

test("exactly 9 Regional Medal definitions exist, one per region", () => {
  assert.equal(REGIONAL_MEDAL_DEFINITIONS.length, 9);
  assert.deepEqual(
    REGIONAL_MEDAL_DEFINITIONS.map((m) => m.regionId).sort(),
    [...EXPECTED_REGION_IDS].sort()
  );
});

test("each medal's image path follows /images/gyms/medals/<medal-id>.png", () => {
  for (const medal of REGIONAL_MEDAL_DEFINITIONS) {
    assert.equal(medal.id, `${medal.regionId}-medal`);
    assert.equal(medal.imageUrl, `/images/gyms/medals/${medal.id}.png`);
  }
});

test("getRegionalMedalDefinition returns the matching catalog entry", () => {
  const medal = getRegionalMedalDefinition("paldea");
  assert.equal(medal.id, "paldea-medal");
  assert.equal(medal.displayName, "Paldea Regional Medal");
});
