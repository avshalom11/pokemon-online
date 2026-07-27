import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_DAMAGE_RANDOM_FACTOR, MIN_DAMAGE_RANDOM_FACTOR } from "./damage-calculation.ts";
import { rollDamageRandomFactor } from "./random.ts";

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
