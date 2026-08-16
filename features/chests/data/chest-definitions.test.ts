import assert from "node:assert/strict";
import { test } from "node:test";

import { CHEST_DEFINITIONS, getChestDefinition } from "./chest-definitions.ts";

test("exactly 3 chest types are defined: silver, gold, diamond", () => {
  assert.equal(CHEST_DEFINITIONS.length, 3);
  assert.deepEqual(
    CHEST_DEFINITIONS.map((definition) => definition.id).sort(),
    ["diamond", "gold", "silver"]
  );
});

test("every chest's image points at the exact spec'd path under /images/chests/", () => {
  assert.equal(getChestDefinition("silver").imageUrl, "/images/chests/silver.png");
  assert.equal(getChestDefinition("gold").imageUrl, "/images/chests/gold.png");
  assert.equal(getChestDefinition("diamond").imageUrl, "/images/chests/diamond.png");
});

test("every chest has a non-empty Hebrew display name and an ascending tier", () => {
  for (const definition of CHEST_DEFINITIONS) {
    assert.ok(definition.displayName.length > 0);
  }
  assert.equal(getChestDefinition("silver").tier, 1);
  assert.equal(getChestDefinition("gold").tier, 2);
  assert.equal(getChestDefinition("diamond").tier, 3);
});

test("getChestDefinition throws for an unknown chest type", () => {
  assert.throws(() => getChestDefinition("platinum"));
  assert.throws(() => getChestDefinition(""));
});

// CHESTS PHASE 1 is data/ownership only — no reward pool, drop weight, or
// price field belongs on this definition yet.
test("no reward/opening/pricing metadata exists on the chest definition yet", () => {
  for (const definition of CHEST_DEFINITIONS) {
    assert.equal(Object.hasOwn(definition, "price"), false);
    assert.equal(Object.hasOwn(definition, "rewardPool"), false);
    assert.equal(Object.hasOwn(definition, "dropWeights"), false);
  }
});
