import assert from "node:assert/strict";
import { test } from "node:test";

import { ALL_MOVE_FLAGS, moveFlagSchema } from "./move-flags.ts";

test("ALL_MOVE_FLAGS has no duplicates", () => {
  assert.equal(new Set(ALL_MOVE_FLAGS).size, ALL_MOVE_FLAGS.length);
});

test("every declared flag validates through the schema", () => {
  for (const flag of ALL_MOVE_FLAGS) {
    assert.equal(moveFlagSchema.safeParse(flag).success, true);
  }
});

test("rejects an undeclared flag name", () => {
  assert.equal(moveFlagSchema.safeParse("explodes").success, false);
});
