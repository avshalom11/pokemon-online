import assert from "node:assert/strict";
import { test } from "node:test";

import { DamageValidationError } from "./damage-errors.ts";
import { MAX_ACCURACY, MAX_ACCURACY_ROLL, MIN_ACCURACY, MIN_ACCURACY_ROLL, checkMoveAccuracy } from "./accuracy.ts";

// Pure unit tests for the Phase 5E accuracy/miss gate — no Move Registry,
// no Damage Engine, just checkMoveAccuracy's own hit/miss/validation rules.
// See damage-calculation.test.ts's own "Phase 5E: Accuracy" section for how
// this plugs into the full calculateMoveDamage pipeline (short-circuiting
// before STAB/Type Effectiveness on a miss).

// --- Hit / miss boundaries -----------------------------------------------------

test("accuracy 100 always hits, for every possible roll 0-99", () => {
  for (let roll = 0; roll <= 99; roll++) {
    const result = checkMoveAccuracy(100, roll);
    assert.equal(result.hit, true, `roll ${roll} against accuracy 100 must hit`);
  }
});

test("accuracy 0 always misses, for every possible roll 0-99", () => {
  for (let roll = 0; roll <= 99; roll++) {
    const result = checkMoveAccuracy(0, roll);
    assert.equal(result.hit, false, `roll ${roll} against accuracy 0 must miss`);
  }
});

test("accuracy 95 hits on a low roll (well within the 95% hit band)", () => {
  const result = checkMoveAccuracy(95, 0);
  assert.equal(result.hit, true);
});

test("accuracy 95 misses on a roll in its 5% miss band (95-99)", () => {
  const result = checkMoveAccuracy(95, 95);
  assert.equal(result.hit, false);
});

test("accuracy 95's hit/miss boundary is exactly at roll 94/95", () => {
  assert.equal(checkMoveAccuracy(95, 94).hit, true);
  assert.equal(checkMoveAccuracy(95, 95).hit, false);
});

test("accuracy 70 hits on a roll below it", () => {
  const result = checkMoveAccuracy(70, 30);
  assert.equal(result.hit, true);
});

test("accuracy 70 misses on a roll at or above it", () => {
  const result = checkMoveAccuracy(70, 70);
  assert.equal(result.hit, false);
});

test("a hit result reports back the exact accuracy and accuracyRoll it was decided from", () => {
  const result = checkMoveAccuracy(70, 30);
  assert.equal(result.hit, true);
  assert.equal(result.accuracy, 70);
  assert.equal(result.accuracyRoll, 30);
});

test("a miss result reports back the exact accuracy and accuracyRoll it was decided from", () => {
  const result = checkMoveAccuracy(70, 70);
  assert.equal(result.hit, false);
  assert.equal(result.accuracy, 70);
  assert.equal(result.accuracyRoll, 70);
});

// --- Always-hit moves (accuracy null) --------------------------------------------

test("accuracy null (e.g. Swift/Bide/Struggle) always hits and never consumes a roll", () => {
  const result = checkMoveAccuracy(null, 99);
  assert.equal(result.hit, true);
  assert.equal(result.accuracy, null);
  assert.equal(result.accuracyRoll, null);
});

// --- Missing data resolves to an automatic hit, never a throw --------------------

test("omitting accuracy entirely (a pre-Phase-5E caller) always hits", () => {
  const result = checkMoveAccuracy(undefined, undefined);
  assert.equal(result.hit, true);
  assert.equal(result.accuracy, null);
  assert.equal(result.accuracyRoll, null);
});

test("a real numeric accuracy without a paired accuracyRoll resolves to an automatic hit, not a throw", () => {
  const result = checkMoveAccuracy(70, undefined);
  assert.equal(result.hit, true);
  assert.equal(result.accuracy, null);
  assert.equal(result.accuracyRoll, null);
});

// --- Validation: fail loudly on bad data, never silently assume 100 --------------

test("an accuracy above 100 is rejected", () => {
  assert.throws(() => checkMoveAccuracy(101, 0), DamageValidationError);
});

test("a negative accuracy is rejected", () => {
  assert.throws(() => checkMoveAccuracy(-1, 0), DamageValidationError);
});

test("a non-integer accuracy is rejected", () => {
  assert.throws(() => checkMoveAccuracy(95.5, 0), DamageValidationError);
});

test("an accuracyRoll above 99 is rejected", () => {
  assert.throws(() => checkMoveAccuracy(100, 100), DamageValidationError);
});

test("a negative accuracyRoll is rejected", () => {
  assert.throws(() => checkMoveAccuracy(100, -1), DamageValidationError);
});

test("a non-integer accuracyRoll is rejected", () => {
  assert.throws(() => checkMoveAccuracy(100, 50.5), DamageValidationError);
});

test("the accuracy/roll range constants match the 0-100 / 0-99 spec exactly", () => {
  assert.equal(MIN_ACCURACY, 0);
  assert.equal(MAX_ACCURACY, 100);
  assert.equal(MIN_ACCURACY_ROLL, 0);
  assert.equal(MAX_ACCURACY_ROLL, 99);
});
