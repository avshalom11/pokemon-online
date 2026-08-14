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

test("the real registry loads the full move database (every generation) without throwing", () => {
  // 165 Generation 1 moves + 36 Generation 2 moves + 102 Generation 3 moves
  // + 113 Generation 4 moves (Sinnoh Moves & Learnsets Phase 3) + 87
  // Generation 5 moves (Unova Moves & Learnsets Phase 3) + 60 Generation 6
  // moves (Kalos Moves & Learnsets Phase 3) + 54 Generation 7 moves (Alola
  // Moves & Learnsets Phase 3) + 65 Generation 8 moves (Galar Moves &
  // Learnsets Phase 3) + 33 Generation 9 moves (Paldea Moves & Learnsets
  // Phase 3) = 715. Update this number deliberately whenever a new
  // generation's move data is registered — see engine/moves/data/index.ts.
  assert.equal(getAllMoves().length, 715);
});

test("getMoveById finds a real Generation 1 move by its permanent id", () => {
  const move = getMoveById("thunderbolt");
  assert.ok(move);
  assert.equal(move.name, "Thunderbolt");
});

test("getMoveById returns undefined for an id not in the registry", () => {
  assert.equal(getMoveById("not-a-real-move"), undefined);
});
