import assert from "node:assert/strict";
import { test } from "node:test";

import { NoUsableEnemyMoveError, selectEnemyMove } from "./select-enemy-move.ts";

const KNOWN_MOVES = ["tackle", "growl", "vine-whip", "leech-seed"];

// --- Basic selection ----------------------------------------------------------------

test("selects one move from the given Known Moves", () => {
  const selected = selectEnemyMove(KNOWN_MOVES, () => 0.4);
  assert.ok(KNOWN_MOVES.includes(selected));
});

test("selection is deterministic for a fixed injected random value", () => {
  const first = selectEnemyMove(KNOWN_MOVES, () => 0.4);
  const second = selectEnemyMove(KNOWN_MOVES, () => 0.4);
  assert.equal(first, second);
});

test("a single known move is always selected regardless of the random value", () => {
  assert.equal(selectEnemyMove(["tackle"], () => 0), "tackle");
  assert.equal(selectEnemyMove(["tackle"], () => 0.999999), "tackle");
});

// --- Every known move can be selected -------------------------------------------------

test("every known move is reachable via floor(random() * length), one per equal-width slice", () => {
  // 4 known moves -> boundaries at 0, 0.25, 0.5, 0.75. A random() just
  // below each boundary selects that exact index, proving every index —
  // not just the first or last — is actually reachable.
  assert.equal(selectEnemyMove(KNOWN_MOVES, () => 0), "tackle");
  assert.equal(selectEnemyMove(KNOWN_MOVES, () => 0.25), "growl");
  assert.equal(selectEnemyMove(KNOWN_MOVES, () => 0.5), "vine-whip");
  assert.equal(selectEnemyMove(KNOWN_MOVES, () => 0.75), "leech-seed");
  assert.equal(selectEnemyMove(KNOWN_MOVES, () => 0.999999), "leech-seed");
});

// --- Uniform distribution -------------------------------------------------------------

test("selection is uniformly random: every known move occupies an equal-width slice of [0, 1)", () => {
  // The same floor(random() * length) idiom rollDamageRandomFactor already
  // uses for its own integer roll — sampling every representable
  // hundredth of [0, 1) and counting how many land on each index proves
  // each of the 4 known moves gets exactly 25 out of 100 samples, i.e. an
  // equal-width slice, never a weighted one.
  const counts = new Map<string, number>();
  for (let i = 0; i < 100; i++) {
    const selected = selectEnemyMove(KNOWN_MOVES, () => i / 100);
    counts.set(selected, (counts.get(selected) ?? 0) + 1);
  }

  assert.equal(counts.size, KNOWN_MOVES.length, "every known move must be selected at least once");
  for (const moveId of KNOWN_MOVES) {
    assert.equal(counts.get(moveId), 25);
  }
});

test("the default random source (Math.random) also returns one of the known moves", () => {
  const selected = selectEnemyMove(KNOWN_MOVES);
  assert.ok(KNOWN_MOVES.includes(selected));
});

// --- Invalid state: no usable move ----------------------------------------------------

test("throws NoUsableEnemyMoveError when there are no known moves to choose from", () => {
  assert.throws(() => selectEnemyMove([], () => 0), NoUsableEnemyMoveError);
});

test("never falls back to a fabricated move or fixed damage when the known-move list is empty", () => {
  assert.throws(() => selectEnemyMove([]), (error: unknown) => {
    assert.ok(error instanceof NoUsableEnemyMoveError);
    assert.equal(error.name, "NoUsableEnemyMoveError");
    return true;
  });
});
