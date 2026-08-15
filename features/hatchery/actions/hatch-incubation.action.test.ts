// EGGS PHASE 5 focused coverage for hatchIncubationAction — runs the real
// action (which calls the real EGGS PHASE 4 hatchIncubation service)
// against the in-memory fake DB/session.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { hatchIncubationAction } from "./hatch-incubation.action.ts";
import { startIncubatingEgg } from "@/features/eggs/services/incubation.service";
import { __setSession } from "../../../test/support/fakes/auth-session.fake.ts";
import {
  getEggIncubationRow,
  getIncubatorRows,
  getOwnedEggRow,
  getPlayerPokemonRow,
  resetFakeDb,
  seedIncubator,
  seedOwnedEgg,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
  __setSession({ user: { id: "owner-1" } });
});

async function seedReadyIncubation() {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "standard" });
  const started = await startIncubatingEgg("owner-1", incubator.id, egg.id);
  assert.equal(started.status, "started");
  await prisma.playerEggIncubation.update({ where: { ownedEggId: egg.id }, data: { battleProgress: 400 } });
  return { eggId: egg.id, incubatorId: incubator.id };
}

test("hatching a ready incubation uses the existing Phase 4 service end to end", async () => {
  const { eggId } = await seedReadyIncubation();

  const result = await hatchIncubationAction(eggId);

  assert.equal(result.status, "hatched");
});

test("a not-ready incubation is rejected, not hatched", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "standard" });
  await startIncubatingEgg("owner-1", incubator.id, egg.id); // battleProgress: 0

  const result = await hatchIncubationAction(egg.id);
  assert.equal(result.status, "not-ready");
});

test("a successful hatch empties the incubator (removes the egg and incubation, keeps the incubator itself)", async () => {
  const { eggId, incubatorId } = await seedReadyIncubation();

  await hatchIncubationAction(eggId);

  assert.equal(getOwnedEggRow(eggId), undefined, "the egg must be consumed");
  assert.equal(getEggIncubationRow(eggId), undefined, "the incubation row must be removed");
  const incubatorRows = getIncubatorRows("owner-1");
  assert.equal(incubatorRows.length, 1, "the Standard Incubator itself must remain owned");
  assert.equal(incubatorRows[0].id, incubatorId);
});

test("the hatched Pokémon is placed into storage, never the active party", async () => {
  const { eggId } = await seedReadyIncubation();

  const result = await hatchIncubationAction(eggId);
  assert.equal(result.status, "hatched");
  if (result.status !== "hatched") return;

  const row = getPlayerPokemonRow(result.result.ownedPokemonId);
  assert.ok(row, "a real PlayerPokemon row must exist");
  assert.equal(row?.playerId, "owner-1");
  assert.equal(row?.partySlot, null);
});

test("a retried/racing hatch call for the same incubation is rejected, not a second Pokémon — the server-side guard is the real safety mechanism", async () => {
  const { eggId } = await seedReadyIncubation();

  const first = await hatchIncubationAction(eggId);
  assert.equal(first.status, "hatched");

  const second = await hatchIncubationAction(eggId);
  assert.equal(second.status, "not-found", "the incubation is already gone by the second call");
});

test("rejects when there is no authenticated session", async () => {
  __setSession(null);
  const { eggId } = await seedReadyIncubation();

  const result = await hatchIncubationAction(eggId);
  assert.deepEqual(result, { status: "error" });
});
