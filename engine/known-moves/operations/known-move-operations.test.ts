import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildKnownMoveSet,
  addKnownMove,
  replaceKnownMove,
  removeKnownMove,
  reorderKnownMoves,
} from "./known-move-operations.ts";
import { getKnownMoveIds } from "../queries/known-move-queries.ts";
import type { KnownMoveSet, KnownMoveOperationResult } from "../types/known-move.types.ts";

function expectSuccess(result: KnownMoveOperationResult): KnownMoveSet {
  assert.equal(result.status, "success");
  if (result.status !== "success") throw new Error("unreachable");
  return result.knownMoves;
}

const FOUR_MOVES: KnownMoveSet = expectSuccess(buildKnownMoveSet(["tackle", "growl", "vine-whip", "leech-seed"]));
const TWO_MOVES: KnownMoveSet = expectSuccess(buildKnownMoveSet(["tackle", "growl"]));

// --- buildKnownMoveSet / setKnownMoves equivalent -------------------------

test("buildKnownMoveSet assigns sequential slots from array order", () => {
  const set = expectSuccess(buildKnownMoveSet(["tackle", "growl", "vine-whip"]));
  assert.deepEqual(set, [
    { moveId: "tackle", slot: 1 },
    { moveId: "growl", slot: 2 },
    { moveId: "vine-whip", slot: 3 },
  ]);
});

test("buildKnownMoveSet accepts an empty list", () => {
  assert.deepEqual(expectSuccess(buildKnownMoveSet([])), []);
});

test("buildKnownMoveSet rejects more than four moves", () => {
  const result = buildKnownMoveSet(["tackle", "growl", "vine-whip", "leech-seed", "razor-leaf"]);
  assert.equal(result.status, "moveSetFull");
});

test("buildKnownMoveSet rejects a duplicate moveId in the input", () => {
  const result = buildKnownMoveSet(["tackle", "tackle"]);
  assert.equal(result.status, "validationFailed");
});

test("buildKnownMoveSet rejects an unknown moveId", () => {
  const result = buildKnownMoveSet(["not-a-real-move"]);
  assert.equal(result.status, "validationFailed");
});

// --- addKnownMove ----------------------------------------------------------

test("addKnownMove appends to the next open slot", () => {
  const result = addKnownMove(TWO_MOVES, "vine-whip");
  const set = expectSuccess(result);
  assert.deepEqual(getKnownMoveIds(set), ["tackle", "growl", "vine-whip"]);
  assert.equal(set.find((m) => m.moveId === "vine-whip")?.slot, 3);
});

test("addKnownMove on an empty set uses slot 1", () => {
  const set = expectSuccess(addKnownMove([], "tackle"));
  assert.deepEqual(set, [{ moveId: "tackle", slot: 1 }]);
});

test("addKnownMove rejects an already-known move", () => {
  const result = addKnownMove(TWO_MOVES, "tackle");
  assert.deepEqual(result, { status: "moveAlreadyKnown", moveId: "tackle" });
});

test("addKnownMove rejects a fifth move without replacement", () => {
  const result = addKnownMove(FOUR_MOVES, "razor-leaf");
  assert.deepEqual(result, { status: "moveSetFull" });
});

test("addKnownMove rejects an unknown move id", () => {
  const result = addKnownMove(TWO_MOVES, "not-a-real-move");
  assert.deepEqual(result, { status: "moveNotFound", moveId: "not-a-real-move" });
});

// --- replaceKnownMove --------------------------------------------------

test("replaceKnownMove preserves the slot for each valid slot (1-4)", () => {
  for (let slot = 1; slot <= 4; slot++) {
    const result = replaceKnownMove(FOUR_MOVES, slot, "razor-leaf");
    const set = expectSuccess(result);
    assert.equal(set.find((m) => m.slot === slot)?.moveId, "razor-leaf");
    assert.equal(set.length, 4);
  }
});

test("replaceKnownMove rejects slot 0", () => {
  const result = replaceKnownMove(FOUR_MOVES, 0, "razor-leaf");
  assert.deepEqual(result, { status: "invalidSlot", slot: 0 });
});

test("replaceKnownMove rejects slot 5", () => {
  const result = replaceKnownMove(FOUR_MOVES, 5, "razor-leaf");
  assert.deepEqual(result, { status: "invalidSlot", slot: 5 });
});

test("replaceKnownMove rejects a slot that isn't currently occupied", () => {
  const result = replaceKnownMove(TWO_MOVES, 3, "razor-leaf");
  assert.deepEqual(result, { status: "moveNotKnown", slot: 3 });
});

test("replaceKnownMove rejects an unknown new move id", () => {
  const result = replaceKnownMove(TWO_MOVES, 1, "not-a-real-move");
  assert.deepEqual(result, { status: "moveNotFound", moveId: "not-a-real-move" });
});

test("replaceKnownMove rejects replacing with a move already known in another slot", () => {
  const result = replaceKnownMove(TWO_MOVES, 1, "growl");
  assert.deepEqual(result, { status: "moveAlreadyKnown", moveId: "growl" });
});

test("replaceKnownMove allows replacing a slot with the same move it already holds", () => {
  const result = replaceKnownMove(TWO_MOVES, 1, "tackle");
  const set = expectSuccess(result);
  assert.deepEqual(getKnownMoveIds(set), ["tackle", "growl"]);
});

// --- removeKnownMove and compaction -----------------------------------

test("removeKnownMove removes the move and compacts later slots forward", () => {
  const set = expectSuccess(removeKnownMove(FOUR_MOVES, 2));
  assert.deepEqual(set, [
    { moveId: "tackle", slot: 1 },
    { moveId: "vine-whip", slot: 2 },
    { moveId: "leech-seed", slot: 3 },
  ]);
});

test("removeKnownMove on the last slot needs no compaction", () => {
  const set = expectSuccess(removeKnownMove(FOUR_MOVES, 4));
  assert.deepEqual(getKnownMoveIds(set), ["tackle", "growl", "vine-whip"]);
});

test("removeKnownMove down to zero moves succeeds", () => {
  const oneMove: KnownMoveSet = [{ moveId: "tackle", slot: 1 }];
  assert.deepEqual(expectSuccess(removeKnownMove(oneMove, 1)), []);
});

test("removeKnownMove rejects an invalid slot", () => {
  assert.deepEqual(removeKnownMove(FOUR_MOVES, 0), { status: "invalidSlot", slot: 0 });
  assert.deepEqual(removeKnownMove(FOUR_MOVES, 5), { status: "invalidSlot", slot: 5 });
});

test("removeKnownMove rejects a slot that isn't currently occupied", () => {
  const result = removeKnownMove(TWO_MOVES, 3);
  assert.deepEqual(result, { status: "moveNotKnown", slot: 3 });
});

// --- reorderKnownMoves ---------------------------------------------------

test("reorderKnownMoves reassigns slots to match the requested order", () => {
  const set = expectSuccess(reorderKnownMoves(FOUR_MOVES, ["leech-seed", "vine-whip", "growl", "tackle"]));
  assert.deepEqual(set, [
    { moveId: "leech-seed", slot: 1 },
    { moveId: "vine-whip", slot: 2 },
    { moveId: "growl", slot: 3 },
    { moveId: "tackle", slot: 4 },
  ]);
});

test("reorderKnownMoves rejects a request missing a currently-known move", () => {
  const result = reorderKnownMoves(FOUR_MOVES, ["leech-seed", "vine-whip", "growl"]);
  assert.equal(result.status, "invalidReorder");
});

test("reorderKnownMoves rejects a request with an extra move not currently known", () => {
  const result = reorderKnownMoves(TWO_MOVES, ["tackle", "growl", "vine-whip"]);
  assert.equal(result.status, "invalidReorder");
});

test("reorderKnownMoves rejects a request with a duplicate move id", () => {
  const result = reorderKnownMoves(TWO_MOVES, ["tackle", "tackle"]);
  assert.equal(result.status, "invalidReorder");
});

test("reorderKnownMoves on an empty set with an empty request succeeds trivially", () => {
  assert.deepEqual(expectSuccess(reorderKnownMoves([], [])), []);
});

// --- atomicity / no partial mutation ------------------------------------

test("a failed operation never mutates the input set", () => {
  const before = JSON.stringify(FOUR_MOVES);
  addKnownMove(FOUR_MOVES, "razor-leaf");
  replaceKnownMove(FOUR_MOVES, 0, "razor-leaf");
  removeKnownMove(FOUR_MOVES, 9);
  reorderKnownMoves(FOUR_MOVES, ["tackle"]);
  assert.equal(JSON.stringify(FOUR_MOVES), before);
});
