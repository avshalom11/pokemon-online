import assert from "node:assert/strict";
import { test } from "node:test";

import { EGG_DROP_CHANCE, EGG_RARITY_DROP_WEIGHTS } from "./egg-drop-config.ts";

test("the field-battle egg drop chance is exactly 0.25% (0.0025)", () => {
  assert.equal(EGG_DROP_CHANCE, 0.0025);
});

test("the rarity distribution is exactly 70/20/8/2", () => {
  assert.deepEqual(EGG_RARITY_DROP_WEIGHTS, {
    common: 0.7,
    rare: 0.2,
    "very-rare": 0.08,
    legendary: 0.02,
  });
});

test("the rarity distribution sums to exactly 1", () => {
  const total = Object.values(EGG_RARITY_DROP_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `weights must sum to 1, got ${total}`);
});
