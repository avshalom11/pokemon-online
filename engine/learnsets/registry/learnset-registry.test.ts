import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLearnsetRegistry, getAllLearnsets, getLearnsetByPokemonId, hasLearnset } from "./learnset-registry.ts";
import { BULBASAUR_LEARNSET, SAMPLE_LEARNSETS } from "../test-fixtures.ts";

test("buildLearnsetRegistry indexes every learnset by pokemonId", () => {
  const registry = buildLearnsetRegistry(SAMPLE_LEARNSETS);
  assert.equal(registry.size, SAMPLE_LEARNSETS.length);

  for (const learnset of SAMPLE_LEARNSETS) {
    assert.equal(registry.get(learnset.pokemonId), learnset);
  }
});

test("buildLearnsetRegistry on an empty list produces an empty map", () => {
  const registry = buildLearnsetRegistry([]);
  assert.equal(registry.size, 0);
});

test("a lookup by pokemonId returns that species' learnset", () => {
  const registry = buildLearnsetRegistry(SAMPLE_LEARNSETS);
  assert.equal(registry.get("bulbasaur"), BULBASAUR_LEARNSET);
});

test("the real registry loads the full learnset database (every generation) without throwing", () => {
  // 151 Generation 1 learnsets + 100 Generation 2 learnsets + 138
  // Generation 3 learnsets + 113 Generation 4 learnsets (Sinnoh Moves &
  // Learnsets Phase 3 — 107 Sinnoh base species + 6 alternate forms) + 163
  // Generation 5 learnsets (Unova Moves & Learnsets Phase 3, extended by the
  // Unova Update phase — 156 Unova base species + 7 alternate forms:
  // Tornadus/Thundurus/Landorus Therian, Kyurem Black/White, Keldeo
  // Resolute, Meloetta Pirouette) + 73 Generation 6 learnsets (Kalos Moves &
  // Learnsets Phase 3 — 72 Kalos base species + 1 alternate form: Hoopa
  // Unbound) = 738. Update this number deliberately whenever a new
  // generation's learnset data is registered — see
  // engine/learnsets/data/index.ts.
  assert.equal(getAllLearnsets().length, 738);
});

test("getLearnsetByPokemonId finds a real Generation 1 Pokémon's learnset by its permanent id", () => {
  const learnset = getLearnsetByPokemonId("bulbasaur");
  assert.ok(learnset);
  assert.ok(learnset.entries.length > 0);
});

test("getLearnsetByPokemonId returns undefined for an id not in the registry", () => {
  assert.equal(getLearnsetByPokemonId("not-a-real-pokemon"), undefined);
});

test("hasLearnset returns true for a real Generation 1 Pokémon", () => {
  assert.equal(hasLearnset("bulbasaur"), true);
});

test("hasLearnset returns false for an unknown pokemonId", () => {
  assert.equal(hasLearnset("not-a-real-pokemon"), false);
});
