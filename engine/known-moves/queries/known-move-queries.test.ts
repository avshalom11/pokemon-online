import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getKnownMoveIds,
  getResolvedKnownMoves,
  isMoveKnown,
  getKnownMoveCount,
  isKnownMoveSetFull,
  hasAvailableKnownMoveSlot,
} from "./known-move-queries.ts";
import type { KnownMoveSet } from "../types/known-move.types.ts";

const SAMPLE_SET: KnownMoveSet = [
  { moveId: "vine-whip", slot: 3 },
  { moveId: "tackle", slot: 1 },
  { moveId: "growl", slot: 2 },
];

test("getKnownMoveIds returns move ids in slot order, regardless of input array order", () => {
  assert.deepEqual(getKnownMoveIds(SAMPLE_SET), ["tackle", "growl", "vine-whip"]);
});

test("getKnownMoveIds on an empty set returns an empty array (boundary case)", () => {
  assert.deepEqual(getKnownMoveIds([]), []);
});

test("getResolvedKnownMoves resolves real Move data in slot order", () => {
  const resolved = getResolvedKnownMoves(SAMPLE_SET);
  assert.deepEqual(resolved.map((move) => move.id), ["tackle", "growl", "vine-whip"]);
  assert.equal(resolved[0].name, "Tackle");
});

test("isMoveKnown returns true for a known move and false otherwise", () => {
  assert.equal(isMoveKnown(SAMPLE_SET, "tackle"), true);
  assert.equal(isMoveKnown(SAMPLE_SET, "thunderbolt"), false);
});

test("getKnownMoveCount reflects the set size", () => {
  assert.equal(getKnownMoveCount(SAMPLE_SET), 3);
  assert.equal(getKnownMoveCount([]), 0);
});

test("isKnownMoveSetFull is true at four moves and false below", () => {
  assert.equal(isKnownMoveSetFull(SAMPLE_SET), false);
  const fullSet: KnownMoveSet = [...SAMPLE_SET, { moveId: "leech-seed", slot: 4 }];
  assert.equal(isKnownMoveSetFull(fullSet), true);
});

test("hasAvailableKnownMoveSlot is the inverse of isKnownMoveSetFull", () => {
  assert.equal(hasAvailableKnownMoveSlot(SAMPLE_SET), true);
  const fullSet: KnownMoveSet = [...SAMPLE_SET, { moveId: "leech-seed", slot: 4 }];
  assert.equal(hasAvailableKnownMoveSlot(fullSet), false);
});

test("an empty set has an available slot and is not full", () => {
  assert.equal(isKnownMoveSetFull([]), false);
  assert.equal(hasAvailableKnownMoveSlot([]), true);
});
