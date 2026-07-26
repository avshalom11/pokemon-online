// Phase 4E regression tests for the pending-move-resolution service layer
// (resolvePendingMoveLearn / declinePendingMove / getNextPendingMove /
// hasPendingMoves). Runs the REAL functions from move-learning-service.ts
// and move-learning-queries.ts unmodified — only the "@/lib/db/prisma"
// import they depend on is redirected (see test/support/alias-loader.mjs)
// to an in-memory fake (test/support/fakes/prisma.fake.ts), since this
// project has no disposable database to run automated tests against and
// must never run destructive tests against the shared live Neon DB.
//
// Run via `npm test` (wires up the alias loader); running this file
// through plain `node --test` without that loader will fail to resolve
// its "@/..." imports.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { resolvePendingMoveLearn, declinePendingMove } from "@/features/move-learning/move-learning-service";
import { getNextPendingMove, hasPendingMoves } from "@/features/move-learning/move-learning-queries";
import {
  resetFakeDb,
  seedPlayerPokemon,
  seedKnownMove,
  seedPendingMove,
  getKnownMovesFor,
  getPendingRecord,
} from "../../test/support/fakes/prisma.fake.ts";

const FOUR_KNOWN_MOVES = ["growl", "scratch", "ember", "smokescreen"] as const;

function seedFullyKnownPokemon(playerPokemonId: string, playerId: string) {
  seedPlayerPokemon({ id: playerPokemonId, playerId });
  FOUR_KNOWN_MOVES.forEach((moveId, index) => {
    seedKnownMove({ playerPokemonId, moveId, slot: index + 1 });
  });
}

beforeEach(() => {
  resetFakeDb();
});

test("getNextPendingMove always returns the oldest pending move first (by level, then creation sequence)", async () => {
  seedFullyKnownPokemon("p1", "owner-1");
  // Seeded out of order on purpose, to prove the result depends on
  // (learnedAtLevel, sequence), not insertion order.
  seedPendingMove({ id: "pend-late", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16, sequence: 5 });
  seedPendingMove({ id: "pend-mid", playerPokemonId: "p1", moveId: "tackle", learnedAtLevel: 12, sequence: 2 });
  seedPendingMove({ id: "pend-early", playerPokemonId: "p1", moveId: "vine-whip", learnedAtLevel: 12, sequence: 1 });

  const next = await getNextPendingMove("p1");

  assert.equal(next?.id, "pend-early");
  assert.equal(next?.moveId, "vine-whip");
});

test("a later pending move is never surfaced or resolvable before an earlier one — the queue advances strictly in order", async () => {
  seedFullyKnownPokemon("p1", "owner-1");
  seedPendingMove({ id: "pend-late", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16, sequence: 3 });
  seedPendingMove({ id: "pend-mid", playerPokemonId: "p1", moveId: "tackle", learnedAtLevel: 12, sequence: 2 });
  seedPendingMove({ id: "pend-early", playerPokemonId: "p1", moveId: "vine-whip", learnedAtLevel: 10, sequence: 1 });

  assert.equal((await getNextPendingMove("p1"))?.id, "pend-early");
  await declinePendingMove("pend-early");

  assert.equal((await getNextPendingMove("p1"))?.id, "pend-mid");
  await declinePendingMove("pend-mid");

  assert.equal((await getNextPendingMove("p1"))?.id, "pend-late");
  await declinePendingMove("pend-late");

  assert.equal(await hasPendingMoves("p1"), false);
});

test("learning a pending move replaces exactly the selected slot and preserves every other slot", async () => {
  seedFullyKnownPokemon("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  const result = await resolvePendingMoveLearn("pend1", 2);

  assert.equal(result.status, "success");
  assert.deepEqual(getKnownMovesFor("p1"), [
    { moveId: "growl", slot: 1 },
    { moveId: "dragon-rage", slot: 2 },
    { moveId: "ember", slot: 3 },
    { moveId: "smokescreen", slot: 4 },
  ]);
});

test("learning a pending move marks the pending record as learned", async () => {
  seedFullyKnownPokemon("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  await resolvePendingMoveLearn("pend1", 2);

  const record = getPendingRecord("pend1");
  assert.equal(record?.status, "learned");
  assert.ok(record?.resolvedAt instanceof Date);
  assert.equal(await getNextPendingMove("p1"), undefined);
});

test("declining a pending move leaves Known Moves completely unchanged", async () => {
  seedFullyKnownPokemon("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });
  const before = getKnownMovesFor("p1");

  const result = await declinePendingMove("pend1");

  assert.equal(result.status, "success");
  assert.deepEqual(getKnownMovesFor("p1"), before);
});

test("declining a pending move marks the pending record as declined", async () => {
  seedFullyKnownPokemon("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  await declinePendingMove("pend1");

  const record = getPendingRecord("pend1");
  assert.equal(record?.status, "declined");
  assert.ok(record?.resolvedAt instanceof Date);
  assert.equal(await hasPendingMoves("p1"), false);
});

test("an already-learned pending record cannot be learned or declined again, and nothing changes on the retry", async () => {
  seedFullyKnownPokemon("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });
  await resolvePendingMoveLearn("pend1", 2);
  const afterFirstResolve = getKnownMovesFor("p1");

  const retryLearn = await resolvePendingMoveLearn("pend1", 3);
  assert.deepEqual(retryLearn, { status: "pendingAlreadyResolved", pendingId: "pend1", currentStatus: "learned" });
  assert.deepEqual(getKnownMovesFor("p1"), afterFirstResolve);

  const retryDecline = await declinePendingMove("pend1");
  assert.deepEqual(retryDecline, { status: "pendingAlreadyResolved", pendingId: "pend1", currentStatus: "learned" });
});

test("an already-declined pending record cannot be learned or declined again", async () => {
  seedFullyKnownPokemon("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });
  await declinePendingMove("pend1");
  const knownMovesAfterDecline = getKnownMovesFor("p1");

  const retryLearn = await resolvePendingMoveLearn("pend1", 2);
  assert.deepEqual(retryLearn, { status: "pendingAlreadyResolved", pendingId: "pend1", currentStatus: "declined" });
  assert.deepEqual(getKnownMovesFor("p1"), knownMovesAfterDecline);

  const retryDecline = await declinePendingMove("pend1");
  assert.deepEqual(retryDecline, { status: "pendingAlreadyResolved", pendingId: "pend1", currentStatus: "declined" });
});

test("resolving or declining a pending id that does not exist is rejected", async () => {
  const learnResult = await resolvePendingMoveLearn("no-such-pending", 1);
  assert.deepEqual(learnResult, { status: "pendingNotFound", pendingId: "no-such-pending" });

  const declineResult = await declinePendingMove("no-such-pending");
  assert.deepEqual(declineResult, { status: "pendingNotFound", pendingId: "no-such-pending" });
});

test("invalid slots (out of 1-4 range) are rejected", async () => {
  seedFullyKnownPokemon("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  const tooLow = await resolvePendingMoveLearn("pend1", 0);
  assert.deepEqual(tooLow, { status: "invalidSlot", slot: 0 });

  const tooHigh = await resolvePendingMoveLearn("pend1", 5);
  assert.deepEqual(tooHigh, { status: "invalidSlot", slot: 5 });
});

test("replacement and pending resolution are atomic: a failed slot replacement leaves both Known Moves and the pending record untouched", async () => {
  seedFullyKnownPokemon("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });
  const before = getKnownMovesFor("p1");

  const result = await resolvePendingMoveLearn("pend1", 99);

  assert.equal(result.status, "invalidSlot");
  assert.deepEqual(getKnownMovesFor("p1"), before, "Known Moves must not change when the replacement fails");
  assert.equal(getPendingRecord("pend1")?.status, "pending", "the pending record must not be marked resolved when the replacement fails");
});

test("Known Moves count is always exactly four after learning a pending move", async () => {
  seedFullyKnownPokemon("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  const result = await resolvePendingMoveLearn("pend1", 4);

  assert.equal(result.status, "success");
  assert.equal(getKnownMovesFor("p1").length, 4);
});

test("resolving a pending move for one PlayerPokemon never affects a different PlayerPokemon's Known Moves or pending records", async () => {
  seedFullyKnownPokemon("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  seedPlayerPokemon({ id: "p2", playerId: "owner-2" });
  seedKnownMove({ playerPokemonId: "p2", moveId: "tackle", slot: 1 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "vine-whip", slot: 2 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "ember", slot: 3 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "smokescreen", slot: 4 });
  seedPendingMove({ id: "pend2", playerPokemonId: "p2", moveId: "growl", learnedAtLevel: 10 });
  const p2KnownBefore = getKnownMovesFor("p2");

  const result = await resolvePendingMoveLearn("pend1", 2);

  assert.equal(result.status, "success");
  assert.deepEqual(getKnownMovesFor("p2"), p2KnownBefore);
  assert.equal(getPendingRecord("pend2")?.status, "pending");
  assert.equal((await getNextPendingMove("p2"))?.id, "pend2");
});
