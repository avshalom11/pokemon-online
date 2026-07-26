import assert from "node:assert/strict";
import { test } from "node:test";

import { MoveValidationError, validateMove, validateMoveList } from "./move-validation.ts";
import { SAMPLE_MOVES } from "../test-fixtures.ts";

test("validateMove returns the parsed move for valid data", () => {
  const move = validateMove(SAMPLE_MOVES[0]);
  assert.equal(move.id, SAMPLE_MOVES[0].id);
});

test("validateMove throws MoveValidationError for invalid data", () => {
  assert.throws(
    () => validateMove({ ...SAMPLE_MOVES[0], power: 0 }),
    MoveValidationError
  );
});

test("validateMove's error message names the offending move id", () => {
  try {
    validateMove({ ...SAMPLE_MOVES[0], power: 0 });
    assert.fail("expected validateMove to throw");
  } catch (error) {
    assert.ok(error instanceof MoveValidationError);
    assert.match(error.message, new RegExp(SAMPLE_MOVES[0].id));
  }
});

test("validateMoveList returns every move when the whole list is valid", () => {
  const validated = validateMoveList(SAMPLE_MOVES);
  assert.equal(validated.length, SAMPLE_MOVES.length);
});

test("validateMoveList throws on a duplicate id", () => {
  const withDuplicate = [...SAMPLE_MOVES, { ...SAMPLE_MOVES[0] }];
  assert.throws(() => validateMoveList(withDuplicate), MoveValidationError);
});

test("validateMoveList reports duplicate ids by name", () => {
  const withDuplicate = [...SAMPLE_MOVES, { ...SAMPLE_MOVES[0] }];
  try {
    validateMoveList(withDuplicate);
    assert.fail("expected validateMoveList to throw");
  } catch (error) {
    assert.ok(error instanceof MoveValidationError);
    assert.match(error.message, /Duplicate move id/);
    assert.match(error.message, new RegExp(SAMPLE_MOVES[0].id));
  }
});

test("validateMoveList collects every problem instead of stopping at the first", () => {
  const brokenList = [
    { ...SAMPLE_MOVES[0], power: 0 },
    { ...SAMPLE_MOVES[1], accuracy: 0 },
  ];

  try {
    validateMoveList(brokenList);
    assert.fail("expected validateMoveList to throw");
  } catch (error) {
    assert.ok(error instanceof MoveValidationError);
    assert.match(error.message, /2 problem/);
  }
});
