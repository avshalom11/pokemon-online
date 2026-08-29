// TM SYSTEM PHASE 5 focused coverage for the Server Action wrappers — runs
// the real actions against the in-memory fake DB/session, mirroring
// features/shop/actions/purchase-egg-shop-item.action.test.ts's own shape.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getTmUseCandidatesAction, teachTmAction } from "./tm-use.actions.ts";
import { __setSession } from "../../../test/support/fakes/auth-session.fake.ts";
import { resetFakeDb, seedPlayerPokemon, seedKnownMove, getKnownMovesFor, getInventoryItemRow, seedInventoryItem } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  __setSession({ user: { id: "owner-1" } });
});

test("getTmUseCandidatesAction returns eligible candidates end to end", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "tackle", slot: 1 });

  const result = await getTmUseCandidatesAction("tm-thunderbolt");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]?.playerPokemonId, "mon-1");
});

test("getTmUseCandidatesAction rejects when there is no authenticated session", async () => {
  __setSession(null);
  const result = await getTmUseCandidatesAction("tm-thunderbolt");
  assert.deepEqual(result, { status: "error" });
});

test("teachTmAction teaches the move and consumes the TM end to end", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "tackle", slot: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-thunderbolt", quantity: 1 });

  const result = await teachTmAction("mon-1", "tm-thunderbolt");

  assert.equal(result.status, "success");
  assert.deepEqual(getKnownMovesFor("mon-1"), [
    { moveId: "tackle", slot: 1 },
    { moveId: "thunderbolt", slot: 2 },
  ]);
  // removeInventoryItem deletes the row entirely once quantity reaches
  // zero (never leaves a zero-quantity row behind) — see that function's
  // own doc comment in inventory.service.ts.
  assert.equal(getInventoryItemRow("owner-1", "tm-thunderbolt"), undefined);
});

test("teachTmAction rejects when there is no authenticated session, and changes nothing", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-thunderbolt", quantity: 1 });
  __setSession(null);

  const result = await teachTmAction("mon-1", "tm-thunderbolt");

  assert.deepEqual(result, { status: "error" });
  assert.equal(getInventoryItemRow("owner-1", "tm-thunderbolt")?.quantity, 1);
});

test("teachTmAction rejects an out-of-range forgetSlot via schema validation, without reaching the service", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-thunderbolt", quantity: 1 });

  const result = await teachTmAction("mon-1", "tm-thunderbolt", 9);

  assert.deepEqual(result, { status: "error" });
});

test("an unauthorized player cannot teach a TM to another player's Pokémon", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-2", speciesId: "pikachu" });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-thunderbolt", quantity: 1 });

  const result = await teachTmAction("mon-1", "tm-thunderbolt");

  assert.equal(result.status, "not-owned");
  assert.equal(getInventoryItemRow("owner-1", "tm-thunderbolt")?.quantity, 1);
});
