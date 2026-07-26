// Phase 4E regression tests for the Server Action ownership boundary
// (resolvePendingMoveLearnAction / declinePendingMoveAction /
// getPendingMoveLearningViewAction). Runs the REAL action functions
// unmodified — "@/lib/db/prisma", "@/lib/auth/auth-session",
// "@/lib/auth/player-profile" and "next/cache" are redirected to in-memory
// fakes by test/support/alias-loader.mjs (see that file and
// ../move-learning-service.persistence.test.ts for why: no disposable
// database exists to run this against, and the shared live Neon DB must
// never be touched by automated tests).
//
// Run via `npm test` (wires up the alias loader).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  resolvePendingMoveLearnAction,
  declinePendingMoveAction,
  getPendingMoveLearningViewAction,
} from "@/features/move-learning/actions/move-learning.actions";
import { __setSession } from "../../../test/support/fakes/auth-session.fake.ts";
import {
  resetFakeDb,
  seedPlayerPokemon,
  seedKnownMove,
  seedPendingMove,
  getKnownMovesFor,
  getPendingRecord,
} from "../../../test/support/fakes/prisma.fake.ts";

function seedOwnedPokemonWithPending(playerPokemonId: string, playerId: string, pendingId: string) {
  seedPlayerPokemon({ id: playerPokemonId, playerId });
  seedKnownMove({ playerPokemonId, moveId: "growl", slot: 1 });
  seedKnownMove({ playerPokemonId, moveId: "scratch", slot: 2 });
  seedKnownMove({ playerPokemonId, moveId: "ember", slot: 3 });
  seedKnownMove({ playerPokemonId, moveId: "smokescreen", slot: 4 });
  seedPendingMove({ id: pendingId, playerPokemonId, moveId: "dragon-rage", learnedAtLevel: 16 });
}

beforeEach(() => {
  resetFakeDb();
  __setSession({ user: { id: "owner-A" } });
});

test("resolvePendingMoveLearnAction rejects a session that does not own the pending move's Pokémon", async () => {
  seedOwnedPokemonWithPending("p1", "owner-A", "pend1");
  const knownBefore = getKnownMovesFor("p1");
  __setSession({ user: { id: "owner-B" } });

  const result = await resolvePendingMoveLearnAction("pend1", 2);

  assert.deepEqual(result, { status: "not-owned" });
  assert.deepEqual(getKnownMovesFor("p1"), knownBefore);
  assert.equal(getPendingRecord("pend1")?.status, "pending");
});

test("declinePendingMoveAction rejects a session that does not own the pending move's Pokémon", async () => {
  seedOwnedPokemonWithPending("p1", "owner-A", "pend1");
  __setSession({ user: { id: "owner-B" } });

  const result = await declinePendingMoveAction("pend1");

  assert.deepEqual(result, { status: "not-owned" });
  assert.equal(getPendingRecord("pend1")?.status, "pending");
});

test("resolvePendingMoveLearnAction succeeds when the session's player is the actual owner", async () => {
  seedOwnedPokemonWithPending("p1", "owner-A", "pend1");
  __setSession({ user: { id: "owner-A" } });

  const result = await resolvePendingMoveLearnAction("pend1", 2);

  assert.equal(result.status, "success");
  assert.equal(getPendingRecord("pend1")?.status, "learned");
});

test("getPendingMoveLearningViewAction returns an error when the requested Pokémon does not belong to the session's player", async () => {
  seedOwnedPokemonWithPending("p1", "owner-A", "pend1");
  __setSession({ user: { id: "owner-B" } });

  const result = await getPendingMoveLearningViewAction("p1");

  assert.deepEqual(result, { status: "error" });
});

test("getPendingMoveLearningViewAction succeeds for the actual owner and reports the pending move", async () => {
  seedOwnedPokemonWithPending("p1", "owner-A", "pend1");
  __setSession({ user: { id: "owner-A" } });

  const result = await getPendingMoveLearningViewAction("p1");

  assert.equal(result.status, "ok");
  assert.equal(result.status === "ok" ? result.view.nextPending?.id : undefined, "pend1");
});

test("actions reject the request outright when there is no session at all", async () => {
  seedOwnedPokemonWithPending("p1", "owner-A", "pend1");
  __setSession(null);

  const learnResult = await resolvePendingMoveLearnAction("pend1", 2);
  const declineResult = await declinePendingMoveAction("pend1");
  const viewResult = await getPendingMoveLearningViewAction("p1");

  assert.deepEqual(learnResult, { status: "error" });
  assert.deepEqual(declineResult, { status: "error" });
  assert.deepEqual(viewResult, { status: "error" });
});
