// Focused coverage for hatchIncubationAction — runs the real action (which
// calls the real hatchIncubation service) against the in-memory fake DB/
// session.
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

async function seedReadyIncubation(incubatorTypeId: string, permanentSlot: number | null) {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId, permanentSlot });
  const started = await startIncubatingEgg("owner-1", incubator.id, egg.id);
  assert.equal(started.status, "started");
  if (started.status === "started") {
    await prisma.playerEggIncubation.update({ where: { ownedEggId: egg.id }, data: { battleProgress: started.incubation.requiredBattleTarget } });
  }
  return { eggId: egg.id, incubatorId: incubator.id };
}

test("hatching a ready incubation uses the existing hatch service end to end", async () => {
  const { eggId } = await seedReadyIncubation("regular", 1);

  const result = await hatchIncubationAction(eggId);

  assert.equal(result.status, "hatched");
});

test("a not-ready incubation is rejected, not hatched", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });
  await startIncubatingEgg("owner-1", incubator.id, egg.id); // battleProgress: 0

  const result = await hatchIncubationAction(egg.id);
  assert.equal(result.status, "not-ready");
});

test("a successful hatch with the permanent starter incubator removes the egg and incubation, keeps the incubator itself", async () => {
  const { eggId, incubatorId } = await seedReadyIncubation("regular", 1);

  const result = await hatchIncubationAction(eggId);
  assert.equal(result.status, "hatched");
  if (result.status !== "hatched") return;
  assert.equal(result.incubatorConsumed, false);

  assert.equal(getOwnedEggRow(eggId), undefined, "the egg must be consumed");
  assert.equal(getEggIncubationRow(eggId), undefined, "the incubation row must be removed");
  const incubatorRows = getIncubatorRows("owner-1");
  assert.equal(incubatorRows.length, 1, "the permanent starter incubator itself must remain owned");
  assert.equal(incubatorRows[0].id, incubatorId);
});

test("a successful hatch with a consumable incubator removes the egg, the incubation, AND the incubator itself", async () => {
  const { eggId } = await seedReadyIncubation("ultra", null);

  const result = await hatchIncubationAction(eggId);
  assert.equal(result.status, "hatched");
  if (result.status !== "hatched") return;
  assert.equal(result.incubatorConsumed, true);

  assert.equal(getOwnedEggRow(eggId), undefined, "the egg must be consumed");
  assert.equal(getEggIncubationRow(eggId), undefined, "the incubation row must be removed");
  assert.equal(getIncubatorRows("owner-1").length, 0, "the single-use incubator must be gone");
});

test("the hatched Pokémon is placed into storage, never the active party", async () => {
  const { eggId } = await seedReadyIncubation("regular", 1);

  const result = await hatchIncubationAction(eggId);
  assert.equal(result.status, "hatched");
  if (result.status !== "hatched") return;

  const row = getPlayerPokemonRow(result.result.ownedPokemonId);
  assert.ok(row, "a real PlayerPokemon row must exist");
  assert.equal(row?.playerId, "owner-1");
  assert.equal(row?.partySlot, null);
});

test("a retried/racing hatch call for the same incubation is rejected, not a second Pokémon — the server-side guard is the real safety mechanism", async () => {
  const { eggId } = await seedReadyIncubation("regular", 1);

  const first = await hatchIncubationAction(eggId);
  assert.equal(first.status, "hatched");

  const second = await hatchIncubationAction(eggId);
  assert.equal(second.status, "not-found", "the incubation is already gone by the second call");
});

test("rejects when there is no authenticated session", async () => {
  __setSession(null);
  const { eggId } = await seedReadyIncubation("regular", 1);

  const result = await hatchIncubationAction(eggId);
  assert.deepEqual(result, { status: "error" });
});
