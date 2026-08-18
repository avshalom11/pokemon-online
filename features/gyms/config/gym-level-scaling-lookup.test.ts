import assert from "node:assert/strict";
import { test } from "node:test";

import { deriveGymNpcLevelRange } from "./gym-level-scaling-lookup.ts";
import { GYM_DIFFICULTY_LEVEL_OFFSETS } from "./gym-level-scaling.config.ts";

// Independence from Field Battle's WILD_LEVEL_BRACKETS is an architectural
// property (this module never imports engine/player-level-scaling/
// wild-level-brackets.config.ts at all — see gym-level-scaling.config.ts's
// own doc comment) rather than something meaningfully assertable at
// runtime; the tests below instead verify the approved offsets themselves
// produce the exact documented ranges.

test("Easy Trainer scales player level -4 to -1", () => {
  const range = deriveGymNpcLevelRange(20, "easy");
  assert.deepEqual(range, { minLevel: 16, maxLevel: 19 });
});

test("Medium Trainer scales player level -1 to +2", () => {
  const range = deriveGymNpcLevelRange(20, "medium");
  assert.deepEqual(range, { minLevel: 19, maxLevel: 22 });
});

test("Gym Leader scales player level +2 to +5", () => {
  const range = deriveGymNpcLevelRange(20, "hard");
  assert.deepEqual(range, { minLevel: 22, maxLevel: 25 });
});

test("Regional Champion scales player level +5 to +8", () => {
  const range = deriveGymNpcLevelRange(20, "very-hard");
  assert.deepEqual(range, { minLevel: 25, maxLevel: 28 });
});

test("minimum resulting level is always 1, never below, for a low player level", () => {
  const range = deriveGymNpcLevelRange(2, "easy");
  // player level 2, offsets -4..-1 -> raw -2..1, clamped to 1..1
  assert.deepEqual(range, { minLevel: 1, maxLevel: 1 });
});

test("an invalid player level (NaN/negative) is treated as level 1", () => {
  assert.deepEqual(deriveGymNpcLevelRange(Number.NaN, "easy"), { minLevel: 1, maxLevel: 1 });
  assert.deepEqual(deriveGymNpcLevelRange(-5, "medium"), { minLevel: 1, maxLevel: 3 });
});

test("exactly one offset entry exists per GymDifficulty", () => {
  assert.equal(GYM_DIFFICULTY_LEVEL_OFFSETS.length, 4);
  assert.deepEqual(
    GYM_DIFFICULTY_LEVEL_OFFSETS.map((o) => o.difficulty).sort(),
    ["easy", "hard", "medium", "very-hard"]
  );
});
