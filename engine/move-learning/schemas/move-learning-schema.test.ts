import assert from "node:assert/strict";
import { test } from "node:test";

import { levelUpMoveLearningInputSchema, pendingMoveLearningStatusSchema } from "./move-learning-schema.ts";

test("accepts a well-formed planner input", () => {
  const result = levelUpMoveLearningInputSchema.safeParse({
    pokemonId: "bulbasaur",
    oldLevel: 5,
    newLevel: 10,
    currentKnownMoveIds: ["tackle", "growl"],
    existingPendingMoveIds: [],
  });
  assert.equal(result.success, true);
});

test("rejects more than MAX_KNOWN_MOVES current known moves", () => {
  const result = levelUpMoveLearningInputSchema.safeParse({
    pokemonId: "bulbasaur",
    oldLevel: 5,
    newLevel: 10,
    currentKnownMoveIds: ["tackle", "growl", "vine-whip", "leech-seed", "razor-leaf"],
    existingPendingMoveIds: [],
  });
  assert.equal(result.success, false);
});

test("rejects level 0", () => {
  const result = levelUpMoveLearningInputSchema.safeParse({
    pokemonId: "bulbasaur",
    oldLevel: 0,
    newLevel: 10,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
  });
  assert.equal(result.success, false);
});

test("rejects a malformed move id", () => {
  const result = levelUpMoveLearningInputSchema.safeParse({
    pokemonId: "bulbasaur",
    oldLevel: 5,
    newLevel: 10,
    currentKnownMoveIds: ["Tackle Attack!"],
    existingPendingMoveIds: [],
  });
  assert.equal(result.success, false);
});

test("pendingMoveLearningStatusSchema accepts the three defined statuses", () => {
  for (const status of ["pending", "learned", "declined"]) {
    assert.equal(pendingMoveLearningStatusSchema.safeParse(status).success, true);
  }
});

test("pendingMoveLearningStatusSchema rejects an unrecognized status", () => {
  assert.equal(pendingMoveLearningStatusSchema.safeParse("forgotten").success, false);
});
