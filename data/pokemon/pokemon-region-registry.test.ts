import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_1_POKEMON_DATA } from "./generation-1-pokemon-data.ts";
import { GENERATION_9_POKEMON_DATA } from "./generation-9-pokemon-data.ts";
import { getSpeciesForRegion, POKEMON_BY_REGION } from "./pokemon-region-registry.ts";

test("every real RegionId has a populated species pool", () => {
  for (const regionId of ["kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar", "paldea"] as const) {
    assert.ok(getSpeciesForRegion(regionId).length > 0, `${regionId} must have at least one species`);
  }
});

test("kanto's pool is exactly generation 1's own array — never a dexNumber-range formula", () => {
  assert.equal(POKEMON_BY_REGION.kanto, GENERATION_1_POKEMON_DATA);
});

test("a Paldean Form (e.g. Paldean Wooper) belongs to Paldea even though it shares Johto Wooper's own dexNumber", () => {
  const paldea = getSpeciesForRegion("paldea");
  assert.ok(
    paldea.some((species) => species.id === "wooper-paldea"),
    "wooper-paldea must be in Paldea's own pool"
  );
  // Ordinary (Johto) Wooper must NOT leak into Paldea's pool just because a
  // Form of it lives there — region membership is per-row, not per-dexNumber.
  assert.ok(!paldea.some((species) => species.id === "wooper"));
});

test("Paldea's pool is exactly generation 9's own array", () => {
  assert.equal(POKEMON_BY_REGION.paldea, GENERATION_9_POKEMON_DATA);
});

test("an unrecognized region string safely resolves to an empty pool rather than throwing", () => {
  assert.deepEqual(getSpeciesForRegion("atlantis" as never), []);
});
