import assert from "node:assert/strict";
import { test } from "node:test";

import { knownMoveSetSchema } from "./known-move-schema.ts";

test("accepts an empty move set", () => {
  assert.equal(knownMoveSetSchema.safeParse([]).success, true);
});

test("accepts one move (slot 1)", () => {
  assert.equal(knownMoveSetSchema.safeParse([{ moveId: "tackle", slot: 1 }]).success, true);
});

test("accepts two moves (slots 1, 2)", () => {
  const result = knownMoveSetSchema.safeParse([
    { moveId: "tackle", slot: 1 },
    { moveId: "growl", slot: 2 },
  ]);
  assert.equal(result.success, true);
});

test("accepts four moves (slots 1-4, the maximum)", () => {
  const result = knownMoveSetSchema.safeParse([
    { moveId: "tackle", slot: 1 },
    { moveId: "growl", slot: 2 },
    { moveId: "vine-whip", slot: 3 },
    { moveId: "leech-seed", slot: 4 },
  ]);
  assert.equal(result.success, true);
});

test("rejects five moves", () => {
  const result = knownMoveSetSchema.safeParse([
    { moveId: "tackle", slot: 1 },
    { moveId: "growl", slot: 2 },
    { moveId: "vine-whip", slot: 3 },
    { moveId: "leech-seed", slot: 4 },
    { moveId: "razor-leaf", slot: 5 },
  ]);
  assert.equal(result.success, false);
});

test("rejects slot 0 (never used, mirrors move/learnset engines)", () => {
  assert.equal(knownMoveSetSchema.safeParse([{ moveId: "tackle", slot: 0 }]).success, false);
});

test("rejects slot 5 (out of range)", () => {
  assert.equal(knownMoveSetSchema.safeParse([{ moveId: "tackle", slot: 5 }]).success, false);
});

test("rejects a non-contiguous slot gap ([slot 1, slot 3])", () => {
  const result = knownMoveSetSchema.safeParse([
    { moveId: "tackle", slot: 1 },
    { moveId: "growl", slot: 3 },
  ]);
  assert.equal(result.success, false);
});

test("rejects two moves both in slot 2", () => {
  const result = knownMoveSetSchema.safeParse([
    { moveId: "tackle", slot: 1 },
    { moveId: "growl", slot: 2 },
    { moveId: "vine-whip", slot: 2 },
  ]);
  assert.equal(result.success, false);
});

test("rejects the same move appearing twice", () => {
  const result = knownMoveSetSchema.safeParse([
    { moveId: "tackle", slot: 1 },
    { moveId: "tackle", slot: 2 },
  ]);
  assert.equal(result.success, false);
});

test("rejects a missing slot field", () => {
  const result = knownMoveSetSchema.safeParse([{ moveId: "tackle" }]);
  assert.equal(result.success, false);
});

test("rejects a malformed moveId", () => {
  const result = knownMoveSetSchema.safeParse([{ moveId: "Tackle Attack!", slot: 1 }]);
  assert.equal(result.success, false);
});
