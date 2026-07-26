import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_1_MOVES } from "./index.ts";

// Generation 1 introduced exactly 165 moves — the National Pokédex move
// list from Pound (#1) through Struggle (#165). This is the one number
// this whole database is built around; if it drifts, something is
// duplicated, missing, or miscounted.
const EXPECTED_GENERATION_1_MOVE_COUNT = 165;

test("exactly 165 Generation 1 moves are loaded", () => {
  assert.equal(GENERATION_1_MOVES.length, EXPECTED_GENERATION_1_MOVE_COUNT);
});

test("there are no duplicate move ids", () => {
  const ids = GENERATION_1_MOVES.map((move) => move.id);
  const uniqueIds = new Set(ids);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.equal(uniqueIds.size, ids.length, `duplicate ids found: ${[...new Set(duplicates)].join(", ")}`);
});

test("there are no duplicate move names", () => {
  const names = GENERATION_1_MOVES.map((move) => move.name);
  const uniqueNames = new Set(names);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  assert.equal(uniqueNames.size, names.length, `duplicate names found: ${[...new Set(duplicates)].join(", ")}`);
});

test("there are no duplicate move definitions (same id appearing as separate objects)", () => {
  const seen = new Map<string, number>();
  for (const move of GENERATION_1_MOVES) {
    seen.set(move.id, (seen.get(move.id) ?? 0) + 1);
  }
  const overCounted = [...seen.entries()].filter(([, count]) => count > 1);
  assert.deepEqual(overCounted, []);
});

test("nothing is missing: every move is present exactly once (count matches unique id count)", () => {
  const uniqueIds = new Set(GENERATION_1_MOVES.map((move) => move.id));
  assert.equal(uniqueIds.size, EXPECTED_GENERATION_1_MOVE_COUNT);
});
