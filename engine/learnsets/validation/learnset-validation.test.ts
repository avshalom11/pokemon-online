import assert from "node:assert/strict";
import { test } from "node:test";

import { LearnsetValidationError, validateLearnset, validateLearnsetList } from "./learnset-validation.ts";
import { BULBASAUR_LEARNSET, SAMPLE_LEARNSETS } from "../test-fixtures.ts";

test("validateLearnset returns the parsed learnset for valid data", () => {
  const learnset = validateLearnset(BULBASAUR_LEARNSET);
  assert.equal(learnset.pokemonId, "bulbasaur");
});

test("validateLearnset throws LearnsetValidationError for a shape-invalid learnset", () => {
  assert.throws(
    () => validateLearnset({ ...BULBASAUR_LEARNSET, generation: 0 }),
    LearnsetValidationError
  );
});

// --- unknown move ids ---

test("validateLearnset rejects a learnset referencing an unknown moveId", () => {
  const withUnknownMove = {
    ...BULBASAUR_LEARNSET,
    entries: [{ moveId: "not-a-real-move", method: { kind: "level-up" as const, level: 1 } }],
  };
  assert.throws(() => validateLearnset(withUnknownMove), LearnsetValidationError);
});

test("the unknown-moveId error names both the pokemonId and the moveId", () => {
  const withUnknownMove = {
    ...BULBASAUR_LEARNSET,
    entries: [{ moveId: "not-a-real-move", method: { kind: "level-up" as const, level: 1 } }],
  };
  try {
    validateLearnset(withUnknownMove);
    assert.fail("expected validateLearnset to throw");
  } catch (error) {
    assert.ok(error instanceof LearnsetValidationError);
    assert.match(error.message, /bulbasaur/);
    assert.match(error.message, /not-a-real-move/);
  }
});

// --- unknown pokemon ids ---

test("validateLearnset rejects a learnset referencing an unknown pokemonId", () => {
  const withUnknownPokemon = { ...BULBASAUR_LEARNSET, pokemonId: "not-a-real-pokemon" };
  assert.throws(() => validateLearnset(withUnknownPokemon), LearnsetValidationError);
});

test("the unknown-pokemonId error names the offending pokemonId", () => {
  const withUnknownPokemon = { ...BULBASAUR_LEARNSET, pokemonId: "not-a-real-pokemon" };
  try {
    validateLearnset(withUnknownPokemon);
    assert.fail("expected validateLearnset to throw");
  } catch (error) {
    assert.ok(error instanceof LearnsetValidationError);
    assert.match(error.message, /not-a-real-pokemon/);
  }
});

// --- duplicate Pokémon learnsets across a list ---

test("validateLearnsetList returns every learnset when the whole list is valid", () => {
  const validated = validateLearnsetList(SAMPLE_LEARNSETS);
  assert.equal(validated.length, SAMPLE_LEARNSETS.length);
});

test("validateLearnsetList throws when the same pokemonId appears twice", () => {
  const withDuplicate = [...SAMPLE_LEARNSETS, { ...BULBASAUR_LEARNSET }];
  assert.throws(() => validateLearnsetList(withDuplicate), LearnsetValidationError);
});

test("the duplicate-learnset error names the offending pokemonId", () => {
  const withDuplicate = [...SAMPLE_LEARNSETS, { ...BULBASAUR_LEARNSET }];
  try {
    validateLearnsetList(withDuplicate);
    assert.fail("expected validateLearnsetList to throw");
  } catch (error) {
    assert.ok(error instanceof LearnsetValidationError);
    assert.match(error.message, /Duplicate learnset/);
    assert.match(error.message, /bulbasaur/);
  }
});

test("validateLearnsetList collects every problem instead of stopping at the first", () => {
  const brokenList = [
    { ...BULBASAUR_LEARNSET, pokemonId: "not-a-real-pokemon" },
    {
      ...SAMPLE_LEARNSETS[1],
      entries: [{ moveId: "not-a-real-move", method: { kind: "level-up" as const, level: 1 } }],
    },
  ];

  try {
    validateLearnsetList(brokenList);
    assert.fail("expected validateLearnsetList to throw");
  } catch (error) {
    assert.ok(error instanceof LearnsetValidationError);
    assert.match(error.message, /2 problem/);
  }
});
