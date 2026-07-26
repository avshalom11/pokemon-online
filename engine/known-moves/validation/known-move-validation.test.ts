import assert from "node:assert/strict";
import { test } from "node:test";

import { KnownMoveValidationError, validateKnownMoveSet, isValidKnownMoveSet } from "./known-move-validation.ts";

test("validateKnownMoveSet returns the parsed set for valid data", () => {
  const result = validateKnownMoveSet([{ moveId: "tackle", slot: 1 }]);
  assert.equal(result.length, 1);
});

test("validateKnownMoveSet throws KnownMoveValidationError for a shape-invalid set", () => {
  assert.throws(() => validateKnownMoveSet([{ moveId: "tackle", slot: 0 }]), KnownMoveValidationError);
});

test("validateKnownMoveSet rejects an unknown moveId", () => {
  assert.throws(
    () => validateKnownMoveSet([{ moveId: "not-a-real-move", slot: 1 }]),
    KnownMoveValidationError
  );
});

test("the unknown-moveId error names the offending moveId", () => {
  try {
    validateKnownMoveSet([{ moveId: "not-a-real-move", slot: 1 }]);
    assert.fail("expected validateKnownMoveSet to throw");
  } catch (error) {
    assert.ok(error instanceof KnownMoveValidationError);
    assert.match(error.message, /not-a-real-move/);
  }
});

test("isValidKnownMoveSet returns true for valid data", () => {
  assert.equal(isValidKnownMoveSet([{ moveId: "tackle", slot: 1 }]), true);
});

test("isValidKnownMoveSet returns false for invalid data without throwing", () => {
  assert.equal(isValidKnownMoveSet([{ moveId: "tackle", slot: 0 }]), false);
});
