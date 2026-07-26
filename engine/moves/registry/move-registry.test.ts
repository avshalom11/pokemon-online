import assert from "node:assert/strict";
import { test } from "node:test";

import { buildMoveRegistry, getAllMoves, getMoveById } from "./move-registry.ts";
import { SAMPLE_MOVES } from "../test-fixtures.ts";

test("buildMoveRegistry indexes every move by id", () => {
  const registry = buildMoveRegistry(SAMPLE_MOVES);
  assert.equal(registry.size, SAMPLE_MOVES.length);

  for (const move of SAMPLE_MOVES) {
    assert.equal(registry.get(move.id), move);
  }
});

test("buildMoveRegistry on an empty list produces an empty map", () => {
  const registry = buildMoveRegistry([]);
  assert.equal(registry.size, 0);
});

test("the real registry loads the full Generation 1 move database without throwing", () => {
  assert.equal(getAllMoves().length, 165);
});

test("getMoveById finds a real Generation 1 move by its permanent id", () => {
  const move = getMoveById("thunderbolt");
  assert.ok(move);
  assert.equal(move.name, "Thunderbolt");
});

test("getMoveById returns undefined for an id not in the registry", () => {
  assert.equal(getMoveById("not-a-real-move"), undefined);
});
