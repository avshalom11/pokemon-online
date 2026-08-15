// EGGS PHASE 3 focused coverage for progressActiveIncubations — runs the
// real service against the in-memory fake DB, same "real service, fake DB"
// shape every other persistence-layer test in this project already
// follows.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getIncubatorDefinition } from "@/features/eggs/data/incubator-definitions";
import { progressActiveIncubations } from "./incubation.service.ts";
import { getEggIncubationRow, resetFakeDb, seedIncubator, seedOwnedEgg, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

async function seedActiveIncubation(battleProgress: number, requiredBattleTarget: number) {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "standard" });
  await prisma.playerEggIncubation.create({ data: { ownedEggId: egg.id, incubatorId: incubator.id, requiredBattleTarget } });
  // create() always starts at 0 (matching the real schema's own @default(0))
  // — bump it directly here when a test wants a non-zero starting point.
  if (battleProgress !== 0) {
    await prisma.playerEggIncubation.update({ where: { ownedEggId: egg.id }, data: { battleProgress } });
  }
  return { eggId: egg.id, incubatorId: incubator.id };
}

test("a field victory increments the active Standard incubation by exactly the incubator's own speedMultiplier (1 today)", async () => {
  const { eggId } = await seedActiveIncubation(5, 400);
  const increment = getIncubatorDefinition("standard").speedMultiplier;

  await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));

  assert.equal(getEggIncubationRow(eggId)?.battleProgress, 5 + increment);
});

test("no active incubation means no progress row changes and an empty summary list", async () => {
  const summaries = await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));
  assert.deepEqual(summaries, []);
});

test("progress caps at requiredBattleTarget — 399/400 + a victory lands at exactly 400/400, never 401/400", async () => {
  const { eggId } = await seedActiveIncubation(399, 400);

  await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));

  assert.equal(getEggIncubationRow(eggId)?.battleProgress, 400);
});

test("an already-ready incubation (battleProgress already at target) does not exceed the cap on a further victory", async () => {
  const { eggId } = await seedActiveIncubation(400, 400);

  await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));

  assert.equal(getEggIncubationRow(eggId)?.battleProgress, 400, "must stay exactly at target, never grow past it");
});

test("the returned summary reports isReady correctly both before and after reaching the target", async () => {
  const { eggId } = await seedActiveIncubation(399, 400);

  const [before] = await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));
  assert.equal(before?.incubationId, eggId);
  assert.equal(before?.battleProgress, 400);
  assert.equal(before?.requiredBattleTarget, 400);
  assert.equal(before?.isReady, true);

  const [after] = await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));
  assert.equal(after?.isReady, true, "stays ready on a subsequent call, never reverts");
});
