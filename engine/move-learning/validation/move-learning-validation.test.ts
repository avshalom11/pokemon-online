import assert from "node:assert/strict";
import { test } from "node:test";

import {
  validateLevelUpMoveLearningInput,
  isValidLevelRange,
  MoveLearningValidationError,
} from "./move-learning-validation.ts";

test("validateLevelUpMoveLearningInput returns the parsed input for valid data", () => {
  const input = validateLevelUpMoveLearningInput({
    pokemonId: "bulbasaur",
    oldLevel: 5,
    newLevel: 10,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
  });
  assert.equal(input.pokemonId, "bulbasaur");
});

test("validateLevelUpMoveLearningInput throws for malformed data", () => {
  assert.throws(
    () =>
      validateLevelUpMoveLearningInput({
        pokemonId: "bulbasaur",
        oldLevel: 0,
        newLevel: 10,
        currentKnownMoveIds: [],
        existingPendingMoveIds: [],
      }),
    MoveLearningValidationError
  );
});

test("isValidLevelRange accepts equal levels (empty interval)", () => {
  assert.equal(isValidLevelRange(10, 10), true);
});

test("isValidLevelRange accepts an ascending range", () => {
  assert.equal(isValidLevelRange(5, 10), true);
});

test("isValidLevelRange rejects a descending range", () => {
  assert.equal(isValidLevelRange(10, 5), false);
});
