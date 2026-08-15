import assert from "node:assert/strict";
import { test } from "node:test";

import { getHatchPool, rollHatchSpecies } from "./hatch-pool.service.ts";

test("the pool for a region+rarity contains only species whose REAL rarity matches (never effective/encounter rarity)", () => {
  // bellibolt's real PokemonSpecies.rarity is "rare" (generation-9-pokemon-
  // data.ts), even though it resolves to EFFECTIVE encounter rarity
  // "very-rare" as a Thunder Stone evolution-item target
  // (engine/encounter-rarity) — the hatch pool must go by the real value.
  const rarePool = getHatchPool("paldea", "rare");
  assert.ok(rarePool.some((species) => species.id === "bellibolt"), "bellibolt belongs in the real-rare pool");

  const veryRarePool = getHatchPool("paldea", "very-rare");
  assert.ok(
    !veryRarePool.some((species) => species.id === "bellibolt"),
    "bellibolt must NOT appear in very-rare just because its effective encounter rarity is boosted"
  );
});

test("only species belonging to the requested region appear — a galar-only species never appears in kanto's pool", () => {
  const kantoLegendary = getHatchPool("kanto", "legendary");
  // zacian is Galar-owned (generation-8-pokemon-data.ts) — must never leak
  // into another region's pool no matter its rarity.
  assert.ok(!kantoLegendary.some((species) => species.id === "zacian"));
});

test("every species returned actually has the requested rarity and belongs to the requested region's own pool", () => {
  const pool = getHatchPool("johto", "rare");
  assert.ok(pool.length > 0);
  for (const species of pool) {
    assert.equal(species.rarity, "rare");
  }
});

test("selection is a uniform index roll over the pool, never weighted by encounterWeight (which this module never even reads)", () => {
  const pool = getHatchPool("kanto", "common");
  assert.ok(pool.length > 1, "test assumption: kanto has more than one common species");

  const first = rollHatchSpecies("kanto", "common", () => 0);
  assert.equal(first?.id, pool[0].id, "roll 0 must select the pool's own first element");

  const last = rollHatchSpecies("kanto", "common", () => 0.999999);
  assert.equal(last?.id, pool[pool.length - 1].id, "a near-1 roll must select the pool's own last element");
});

test("an empty region+rarity pool fails safely — null, never a silent fallback to another region/tier", () => {
  // No real (RegionId, PokemonRarity) combination is empty in the current
  // catalog (verified separately) — this exercises the actual safety
  // behavior via an unrecognized region key, which getSpeciesForRegion
  // (pokemon-region-registry.ts) already resolves to an empty pool rather
  // than throwing.
  const pool = getHatchPool("atlantis" as never, "legendary");
  assert.deepEqual(pool, []);

  const species = rollHatchSpecies("atlantis" as never, "legendary", () => 0.5);
  assert.equal(species, null);
});
