import assert from "node:assert/strict";
import { test } from "node:test";

import { getIncubatorDefinition, INCUBATOR_DEFINITIONS, STANDARD_INCUBATOR_TYPE_ID } from "./incubator-definitions.ts";

test("exactly one incubator type is defined for Phase 1: standard", () => {
  assert.equal(INCUBATOR_DEFINITIONS.length, 1);
  assert.equal(INCUBATOR_DEFINITIONS[0].id, "standard");
  assert.equal(STANDARD_INCUBATOR_TYPE_ID, "standard");
});

test("the standard incubator's speed multiplier is exactly 1", () => {
  const standard = getIncubatorDefinition("standard");
  assert.equal(standard.speedMultiplier, 1);
});

test("the standard incubator is marked as the permanent default (never a consumable)", () => {
  const standard = getIncubatorDefinition("standard");
  assert.equal(standard.isPermanentDefault, true);
});

test("getIncubatorDefinition throws for an unknown incubator type", () => {
  assert.throws(() => getIncubatorDefinition("x2"));
});
