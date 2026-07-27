import assert from "node:assert/strict";
import { test } from "node:test";

import { DamageValidationError } from "./damage-errors.ts";
import { CRITICAL_HIT_CHANCE, CRITICAL_HIT_MULTIPLIER, MAX_CRITICAL_ROLL, MIN_CRITICAL_ROLL, checkCriticalHit } from "./critical.ts";

// Pure unit tests for the Phase 5F critical-hit gate — no Move Registry,
// no Damage Engine, just checkCriticalHit's own critical/no-critical/
// validation rules. See damage-calculation.test.ts's own "Phase 5F:
// Critical Hit" section for how this plugs into the full
// calculateMoveDamage pipeline (applying its 1.5x multiplier only after
// STAB/Type Effectiveness, and never for a miss/immune/status result).

// --- Critical / no-critical boundary ---------------------------------------------

test("a roll just below CRITICAL_HIT_CHANCE is a critical hit", () => {
  const result = checkCriticalHit(CRITICAL_HIT_CHANCE - 0.0001);
  assert.equal(result.critical, true);
});

test("a roll exactly at CRITICAL_HIT_CHANCE is not a critical hit (the check is a strict less-than)", () => {
  const result = checkCriticalHit(CRITICAL_HIT_CHANCE);
  assert.equal(result.critical, false);
});

test("a roll of exactly 0 (the minimum) is always a critical hit", () => {
  const result = checkCriticalHit(0);
  assert.equal(result.critical, true);
});

test("a roll well above CRITICAL_HIT_CHANCE is never a critical hit", () => {
  const result = checkCriticalHit(0.5);
  assert.equal(result.critical, false);
});

test("a hit result reports back the exact criticalRoll it was decided from", () => {
  const result = checkCriticalHit(0.5);
  assert.equal(result.criticalRoll, 0.5);
});

test("a critical result reports back the exact criticalRoll it was decided from", () => {
  const result = checkCriticalHit(0.01);
  assert.equal(result.critical, true);
  assert.equal(result.criticalRoll, 0.01);
});

// --- Missing data resolves to "never critical", never a throw --------------------

test("omitting criticalRoll entirely (a pre-Phase-5F caller) is never critical", () => {
  const result = checkCriticalHit(undefined);
  assert.equal(result.critical, false);
  assert.equal(result.criticalRoll, null);
});

// --- Validation: fail loudly on bad data, never silently clamp -------------------

test("a criticalRoll of exactly 1 (the exclusive upper bound) is rejected", () => {
  assert.throws(() => checkCriticalHit(1), DamageValidationError);
});

test("a criticalRoll above 1 is rejected", () => {
  assert.throws(() => checkCriticalHit(1.5), DamageValidationError);
});

test("a negative criticalRoll is rejected", () => {
  assert.throws(() => checkCriticalHit(-0.1), DamageValidationError);
});

test("a non-finite criticalRoll (NaN) is rejected", () => {
  assert.throws(() => checkCriticalHit(Number.NaN), DamageValidationError);
});

test("a non-finite criticalRoll (Infinity) is rejected", () => {
  assert.throws(() => checkCriticalHit(Number.POSITIVE_INFINITY), DamageValidationError);
});

// --- Constants ---------------------------------------------------------------------

test("CRITICAL_HIT_CHANCE is the documented global 1/24 chance", () => {
  assert.equal(CRITICAL_HIT_CHANCE, 1 / 24);
});

test("CRITICAL_HIT_MULTIPLIER is the documented 1.5x", () => {
  assert.equal(CRITICAL_HIT_MULTIPLIER, 1.5);
});

test("the critical-roll range constants match the [0, 1) spec exactly", () => {
  assert.equal(MIN_CRITICAL_ROLL, 0);
  assert.equal(MAX_CRITICAL_ROLL, 1);
});
