// CHESTS PHASE 2 — focused coverage for the reusable randomness primitives
// (rollInt, pickUniform, pickDistinctUniform, rollWeightedOptions,
// rollBonusCategories). All deterministic via injected random() sequences
// — never statistical/flaky.
import assert from "node:assert/strict";
import { test } from "node:test";

import { pickDistinctUniform, pickUniform, rollBonusCategories, rollInt, rollWeightedOptions } from "./chest-reward-roll.service.ts";
import { sequenceRandom } from "../../../test/support/deterministic-random.ts";

test("rollInt is inclusive on both ends: min at random()=0, max at random()=0.999999", () => {
  assert.equal(rollInt(500, 1500, sequenceRandom([0])), 500);
  assert.equal(rollInt(500, 1500, sequenceRandom([0.999999])), 1500);
  assert.equal(rollInt(1, 5, sequenceRandom([0])), 1);
  assert.equal(rollInt(1, 5, sequenceRandom([0.999999])), 5);
});

test("rollInt covers every value in a small range across the full [0,1) sweep", () => {
  // [2, 6] has width 5 — verify every one of the 5 possible outputs is
  // reachable at the exact boundary that should produce it.
  assert.equal(rollInt(2, 6, sequenceRandom([0])), 2);
  assert.equal(rollInt(2, 6, sequenceRandom([0.2])), 3);
  assert.equal(rollInt(2, 6, sequenceRandom([0.4])), 4);
  assert.equal(rollInt(2, 6, sequenceRandom([0.6])), 5);
  assert.equal(rollInt(2, 6, sequenceRandom([0.8])), 6);
});

test("pickUniform selects by proportional index across the full options array", () => {
  const options = ["a", "b", "c", "d"] as const;
  assert.equal(pickUniform(options, sequenceRandom([0])), "a");
  assert.equal(pickUniform(options, sequenceRandom([0.26])), "b");
  assert.equal(pickUniform(options, sequenceRandom([0.51])), "c");
  assert.equal(pickUniform(options, sequenceRandom([0.999999])), "d");
});

test("pickDistinctUniform never repeats an element within one call", () => {
  const picked = pickDistinctUniform(["a", "b", "c", "d", "e"], 5, sequenceRandom([0, 0, 0, 0, 0]));
  assert.equal(new Set(picked).size, 5, "all 5 must be distinct — the entire pool, in some order");
  assert.deepEqual([...picked].sort(), ["a", "b", "c", "d", "e"]);
});

test("pickDistinctUniform: every element of the pool is reachable as the FIRST pick (uniform, not biased toward one end)", () => {
  const pool = ["a", "b", "c", "d"];
  assert.equal(pickDistinctUniform(pool, 1, sequenceRandom([0]))[0], "a");
  assert.equal(pickDistinctUniform(pool, 1, sequenceRandom([0.26]))[0], "b");
  assert.equal(pickDistinctUniform(pool, 1, sequenceRandom([0.51]))[0], "c");
  assert.equal(pickDistinctUniform(pool, 1, sequenceRandom([0.99]))[0], "d");
});

test("pickDistinctUniform with count 0 makes no random() calls and returns an empty array", () => {
  const picked = pickDistinctUniform(["a", "b"], 0, sequenceRandom([]));
  assert.deepEqual(picked, []);
});

test("rollWeightedOptions respects unequal internal weights (e.g. Diamond's 40/40/20) at their exact boundaries", () => {
  const options = [
    { weight: 0.4, build: () => "A" },
    { weight: 0.4, build: () => "B" },
    { weight: 0.2, build: () => "C" },
  ];
  assert.equal(rollWeightedOptions(options, sequenceRandom([0])), "A");
  assert.equal(rollWeightedOptions(options, sequenceRandom([0.39999])), "A");
  assert.equal(rollWeightedOptions(options, sequenceRandom([0.4])), "B");
  assert.equal(rollWeightedOptions(options, sequenceRandom([0.79999])), "B");
  assert.equal(rollWeightedOptions(options, sequenceRandom([0.8])), "C");
  assert.equal(rollWeightedOptions(options, sequenceRandom([0.999999])), "C");
});

test("rollWeightedOptions passes the SAME random source into the winning option's own build, so it can roll further values", () => {
  const options = [
    { weight: 0.5, build: (r: () => number) => rollInt(1, 10, r) },
    { weight: 0.5, build: (r: () => number) => rollInt(100, 110, r) },
  ];
  // First call (0) selects option A (roll < 0.5), second call (0.999999) is
  // consumed by option A's own rollInt, landing at its max (10).
  assert.equal(rollWeightedOptions(options, sequenceRandom([0, 0.999999])), 10);
});

test("rollBonusCategories: every candidate gets its own independent 50% check, zero passing is possible", () => {
  const passed = rollBonusCategories(["a", "b", "c"], 2, sequenceRandom([0.9, 0.9, 0.9]));
  assert.deepEqual(passed, [], "all 3 rolls failed (>= 0.5) — zero bonus categories, no further random() calls for a cap step");
});

test("rollBonusCategories: fewer passes than the cap awards all of them, uncapped", () => {
  const passed = rollBonusCategories(["a", "b", "c"], 2, sequenceRandom([0, 0.9, 0]));
  assert.deepEqual(passed, ["a", "c"], "exactly the 2 that passed, no cap-selection step needed since 2 <= cap");
});

test("rollBonusCategories: more passes than the cap triggers a uniform choice among the successes, never a fixed truncation", () => {
  // All 4 pass, cap is 2 -> pickDistinctUniform(passed=[a,b,c,d], 2, ...) consumes 2 more calls.
  const passed = rollBonusCategories(["a", "b", "c", "d"], 2, sequenceRandom([0, 0, 0, 0, 0.99, 0]));
  assert.equal(passed.length, 2);
  assert.ok(passed.every((category) => ["a", "b", "c", "d"].includes(category)));
  assert.equal(new Set(passed).size, 2, "never the same category twice");
});

test("rollBonusCategories: cap: null never triggers a selection step even if every candidate passes", () => {
  const passed = rollBonusCategories(["a", "b", "c"], null, sequenceRandom([0, 0, 0]));
  assert.deepEqual(passed, ["a", "b", "c"], "uncapped — every passing candidate is awarded, exhausting the sequence at exactly 3 calls");
});
