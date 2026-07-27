import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_DAMAGE_RANDOM_FACTOR, MIN_DAMAGE_RANDOM_FACTOR } from "./damage-calculation.ts";
import { rollAccuracyCheck, rollCriticalHit, rollDamageRandomFactor } from "./random.ts";
import { MAX_ACCURACY_ROLL, MIN_ACCURACY_ROLL } from "./accuracy.ts";
import { MAX_CRITICAL_ROLL, MIN_CRITICAL_ROLL } from "./critical.ts";

test("a random() of 0 rolls the minimum boundary, 0.85", () => {
  assert.equal(rollDamageRandomFactor(() => 0), MIN_DAMAGE_RANDOM_FACTOR);
});

test("a random() just under 1 rolls the maximum boundary, 1.00", () => {
  assert.equal(rollDamageRandomFactor(() => 0.999999), MAX_DAMAGE_RANDOM_FACTOR);
});

test("every roll stays within [0.85, 1.00] across the full random() range", () => {
  // random() follows the Math.random() contract: [0, 1), so i only goes up
  // to 99 here (i/100 = 0.99), never reaching 1.0 itself.
  for (let i = 0; i < 100; i++) {
    const factor = rollDamageRandomFactor(() => i / 100);
    assert.ok(factor >= MIN_DAMAGE_RANDOM_FACTOR);
    assert.ok(factor <= MAX_DAMAGE_RANDOM_FACTOR);
  }
});

test("the default random source (Math.random) also stays within [0.85, 1.00]", () => {
  const factor = rollDamageRandomFactor();
  assert.ok(factor >= MIN_DAMAGE_RANDOM_FACTOR);
  assert.ok(factor <= MAX_DAMAGE_RANDOM_FACTOR);
});

// --- Phase 5E: rollAccuracyCheck --------------------------------------------------

test("a random() of 0 rolls the minimum accuracy-roll boundary, 0", () => {
  assert.equal(rollAccuracyCheck(() => 0), MIN_ACCURACY_ROLL);
});

test("a random() just under 1 rolls the maximum accuracy-roll boundary, 99", () => {
  assert.equal(rollAccuracyCheck(() => 0.999999), MAX_ACCURACY_ROLL);
});

test("every accuracy roll stays within [0, 99] across the full random() range", () => {
  for (let i = 0; i < 100; i++) {
    const roll = rollAccuracyCheck(() => i / 100);
    assert.ok(roll >= MIN_ACCURACY_ROLL);
    assert.ok(roll <= MAX_ACCURACY_ROLL);
  }
});

test("the default random source (Math.random) also stays within [0, 99]", () => {
  const roll = rollAccuracyCheck();
  assert.ok(roll >= MIN_ACCURACY_ROLL);
  assert.ok(roll <= MAX_ACCURACY_ROLL);
});

// --- Phase 5F: rollCriticalHit -----------------------------------------------------

test("a random() of 0 rolls the minimum critical-roll boundary, 0", () => {
  assert.equal(rollCriticalHit(() => 0), MIN_CRITICAL_ROLL);
});

test("a random() just under 1 rolls just under the maximum critical-roll boundary, 1", () => {
  assert.equal(rollCriticalHit(() => 0.999999), 0.999999);
  assert.ok(rollCriticalHit(() => 0.999999) < MAX_CRITICAL_ROLL);
});

test("rollCriticalHit passes the raw random() value straight through, unlike the integer-percent accuracy/damage rolls", () => {
  assert.equal(rollCriticalHit(() => 0.123456), 0.123456);
});

test("every critical roll stays within [0, 1) across a representative random() range", () => {
  for (let i = 0; i < 100; i++) {
    const roll = rollCriticalHit(() => i / 100);
    assert.ok(roll >= MIN_CRITICAL_ROLL);
    assert.ok(roll < MAX_CRITICAL_ROLL);
  }
});

test("the default random source (Math.random) also stays within [0, 1)", () => {
  const roll = rollCriticalHit();
  assert.ok(roll >= MIN_CRITICAL_ROLL);
  assert.ok(roll < MAX_CRITICAL_ROLL);
});
