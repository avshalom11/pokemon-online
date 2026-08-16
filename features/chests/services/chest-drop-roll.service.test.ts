// CHESTS PHASE 5 — pure, deterministic coverage for the chest-drop roll
// functions (no DB, no randomness left to chance).
import assert from "node:assert/strict";
import { test } from "node:test";

import { CHEST_DROP_CHANCE, CHEST_TYPE_DROP_WEIGHTS } from "@/features/chests/data/chest-drop-config";
import { rollChestDrop, rollChestType } from "./chest-drop-roll.service.ts";

test("the global chest-drop chance is exactly 0.12% (0.0012)", () => {
  assert.equal(CHEST_DROP_CHANCE, 0.0012);
});

test("chest-type weights are exactly 55/35/10 and sum to 1", () => {
  assert.equal(CHEST_TYPE_DROP_WEIGHTS.silver, 0.55);
  assert.equal(CHEST_TYPE_DROP_WEIGHTS.gold, 0.35);
  assert.equal(CHEST_TYPE_DROP_WEIGHTS.diamond, 0.1);
  assert.equal(CHEST_TYPE_DROP_WEIGHTS.silver + CHEST_TYPE_DROP_WEIGHTS.gold + CHEST_TYPE_DROP_WEIGHTS.diamond, 1);
});

test("rollChestDrop is true just under the threshold and false at/above it", () => {
  assert.equal(rollChestDrop(() => 0), true);
  assert.equal(rollChestDrop(() => 0.0011999), true);
  assert.equal(rollChestDrop(() => 0.0012), false);
  assert.equal(rollChestDrop(() => 0.999999), false);
});

test("rollChestType picks silver/gold/diamond at the exact 55/90/100 cumulative boundaries", () => {
  assert.equal(rollChestType(() => 0), "silver");
  assert.equal(rollChestType(() => 0.5499), "silver");
  assert.equal(rollChestType(() => 0.55), "gold");
  assert.equal(rollChestType(() => 0.8999), "gold");
  assert.equal(rollChestType(() => 0.9), "diamond");
  assert.equal(rollChestType(() => 0.999999), "diamond");
});
