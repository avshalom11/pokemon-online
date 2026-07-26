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

test("the real registry loads the full Generation 1 learnset database without throwing", () => {
  assert.equal(getAllLearnsets().length, 151);
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
