import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_1_LEARNSETS } from "./index.ts";
import { validateLearnsetList } from "../../validation/learnset-validation.ts";

// NOTE: GENERATION_1_LEARNSETS holds modern (current-generation) level-up
// data filtered to Generation 1 moves, not the original 1996 Red/Blue/
// Yellow learnsets — see the IMPORTANT note atop ./index.ts. These
// completeness checks are about coverage (151 species, no duplicates, no
// unknown references), not historical accuracy.
//
// Generation 1 has exactly 151 species (Bulbasaur #0001 through Mew #0151).
// This is the one number the whole Phase 4B database is built around; if
// it drifts, something is missing, duplicated, or miscounted.
const EXPECTED_GENERATION_1_POKEMON_COUNT = 151;

test("exactly 151 Generation 1 Pokémon learnsets are loaded", () => {
  assert.equal(GENERATION_1_LEARNSETS.length, EXPECTED_GENERATION_1_POKEMON_COUNT);
});

test("nothing is missing: every learnset is present exactly once (count matches unique pokemonId count)", () => {
  const uniqueIds = new Set(GENERATION_1_LEARNSETS.map((learnset) => learnset.pokemonId));
  assert.equal(uniqueIds.size, EXPECTED_GENERATION_1_POKEMON_COUNT);
});

test("there are no duplicate Pokémon learnsets", () => {
  const ids = GENERATION_1_LEARNSETS.map((learnset) => learnset.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("there are no unknown pokemonIds and no unknown moveIds (validateLearnsetList succeeds with 0 problems)", () => {
  assert.doesNotThrow(() => validateLearnsetList(GENERATION_1_LEARNSETS));
});

test("every learnset passes validation with zero failures", () => {
  const validated = validateLearnsetList(GENERATION_1_LEARNSETS);
  assert.equal(validated.length, EXPECTED_GENERATION_1_POKEMON_COUNT);
});
