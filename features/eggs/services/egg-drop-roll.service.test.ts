import assert from "node:assert/strict";
import { test } from "node:test";

import { rollEggDrop, rollEggRarity } from "./egg-drop-roll.service.ts";

test("rollEggDrop succeeds only for a roll strictly below 0.0025", () => {
  assert.equal(rollEggDrop(() => 0), true);
  assert.equal(rollEggDrop(() => 0.0024), true);
  assert.equal(rollEggDrop(() => 0.0025), false, "the boundary itself must not count as a hit (roll < chance, never <=)");
  assert.equal(rollEggDrop(() => 0.0026), false);
  assert.equal(rollEggDrop(() => 0.999999), false);
});

test("rollEggRarity picks common/rare/very-rare/legendary from the correct cumulative bands", () => {
  // common: [0, 0.7)
  assert.equal(rollEggRarity(() => 0), "common");
  assert.equal(rollEggRarity(() => 0.6999), "common");
  // rare: [0.7, 0.9)
  assert.equal(rollEggRarity(() => 0.7), "rare");
  assert.equal(rollEggRarity(() => 0.8999), "rare");
  // very-rare: [0.9, 0.98)
  assert.equal(rollEggRarity(() => 0.9), "very-rare");
  assert.equal(rollEggRarity(() => 0.9799), "very-rare");
  // legendary: [0.98, 1)
  assert.equal(rollEggRarity(() => 0.98), "legendary");
  assert.equal(rollEggRarity(() => 0.999999), "legendary");
});
