import assert from "node:assert/strict";
import { test } from "node:test";

import { getIncubatorDefinition, INCUBATOR_DEFINITIONS, REGULAR_INCUBATOR_TYPE_ID } from "./incubator-definitions.ts";

test("exactly 4 incubator types are defined: regular, advanced, ultra, master", () => {
  assert.equal(INCUBATOR_DEFINITIONS.length, 4);
  assert.deepEqual(
    INCUBATOR_DEFINITIONS.map((definition) => definition.id).sort(),
    ["advanced", "master", "regular", "ultra"]
  );
  assert.equal(REGULAR_INCUBATOR_TYPE_ID, "regular");
});

test("speed multipliers match the spec exactly: regular x1, advanced x1.5, ultra x2, master x3", () => {
  assert.equal(getIncubatorDefinition("regular").speedMultiplier, 1);
  assert.equal(getIncubatorDefinition("advanced").speedMultiplier, 1.5);
  assert.equal(getIncubatorDefinition("ultra").speedMultiplier, 2);
  assert.equal(getIncubatorDefinition("master").speedMultiplier, 3);
});

test("every incubator's image lives under /images/eggs/, named exactly after its own id", () => {
  for (const definition of INCUBATOR_DEFINITIONS) {
    assert.equal(definition.imageUrl, `/images/eggs/${definition.id}.png`);
  }
});

test("getIncubatorDefinition throws for an unknown incubator type", () => {
  assert.throws(() => getIncubatorDefinition("standard"));
  assert.throws(() => getIncubatorDefinition("x2"));
});
