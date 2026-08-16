// Focused coverage for progressActiveIncubations — runs the real service
// against the in-memory fake DB, same "real service, fake DB" shape every
// other persistence-layer test in this project already follows.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { progressActiveIncubations } from "./incubation.service.ts";
import { getEggIncubationRow, resetFakeDb, seedIncubator, seedOwnedEgg, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

async function seedActiveIncubation(incubatorTypeId: string, battleProgress: number, requiredBattleTarget: number) {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId });
  await prisma.playerEggIncubation.create({ data: { ownedEggId: egg.id, incubatorId: incubator.id, requiredBattleTarget } });
  // create() always starts at 0 (matching the real schema's own @default(0))
  // — bump it directly here when a test wants a non-zero starting point.
  if (battleProgress !== 0) {
    await prisma.playerEggIncubation.update({ where: { ownedEggId: egg.id }, data: { battleProgress } });
  }
  return { eggId: egg.id, incubatorId: incubator.id };
}

// INCUBATOR SPEED MODEL — every eligible victory always adds exactly +1,
// regardless of incubator type/speed. Speed only ever shortens the target
// at start time (incubation.service.test.ts covers that half).
test("a field victory increments any active incubation by exactly +1, regardless of incubator type", async () => {
  const { eggId } = await seedActiveIncubation("regular", 5, 400);

  await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));

  assert.equal(getEggIncubationRow(eggId)?.battleProgress, 6);
});

test("Advanced (x1.5), Ultra (x2), and Master (x3) incubations all still progress by exactly +1 per victory, never a scaled amount", async () => {
  const { eggId: advancedEggId } = await seedActiveIncubation("advanced", 0, 267);
  const { eggId: ultraEggId } = await seedActiveIncubation("ultra", 0, 200);
  const { eggId: masterEggId } = await seedActiveIncubation("master", 0, 134);

  await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));

  assert.equal(getEggIncubationRow(advancedEggId)?.battleProgress, 1);
  assert.equal(getEggIncubationRow(ultraEggId)?.battleProgress, 1);
  assert.equal(getEggIncubationRow(masterEggId)?.battleProgress, 1);
});

test("repeated victories accumulate one at a time, with zero drift across many calls", async () => {
  const { eggId } = await seedActiveIncubation("advanced", 0, 267);

  for (let i = 1; i <= 5; i += 1) {
    await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));
    assert.equal(getEggIncubationRow(eggId)?.battleProgress, i);
  }
});

// A player who owns several incubators progresses every active incubation
// simultaneously from a single victory, each by the same flat +1.
test("a single victory progresses every active incubation the player owns simultaneously, each by exactly +1", async () => {
  const { eggId: regularEggId } = await seedActiveIncubation("regular", 0, 400);
  const { eggId: advancedEggId } = await seedActiveIncubation("advanced", 0, 267);
  const { eggId: ultraEggId } = await seedActiveIncubation("ultra", 0, 200);

  await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));

  assert.equal(getEggIncubationRow(regularEggId)?.battleProgress, 1);
  assert.equal(getEggIncubationRow(advancedEggId)?.battleProgress, 1);
  assert.equal(getEggIncubationRow(ultraEggId)?.battleProgress, 1);
});

test("no active incubation means no progress row changes and an empty summary list", async () => {
  const summaries = await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));
  assert.deepEqual(summaries, []);
});

test("progress caps at requiredBattleTarget — never overshoots", async () => {
  const { eggId } = await seedActiveIncubation("regular", 399, 400);

  await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));

  assert.equal(getEggIncubationRow(eggId)?.battleProgress, 400, "399 + 1 lands at exactly 400, never 401");
});

test("an already-ready incubation (battleProgress already at target) does not exceed the cap on a further victory — it remains ready, and does not auto-hatch", async () => {
  const { eggId } = await seedActiveIncubation("regular", 400, 400);

  const [summary] = await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));

  assert.equal(getEggIncubationRow(eggId)?.battleProgress, 400, "must stay exactly at target, never grow past it");
  assert.equal(summary?.isReady, true, "stays ready");
  assert.ok(getEggIncubationRow(eggId), "the incubation row must still exist — progressActiveIncubations never hatches anything itself");
});

test("the returned summary reports isReady correctly both before and after reaching the target", async () => {
  const { eggId } = await seedActiveIncubation("regular", 399, 400);

  const [before] = await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));
  assert.equal(before?.incubationId, eggId);
  assert.equal(before?.battleProgress, 400);
  assert.equal(before?.requiredBattleTarget, 400);
  assert.equal(before?.isReady, true);

  const [after] = await prisma.$transaction((tx) => progressActiveIncubations(tx, "owner-1"));
  assert.equal(after?.isReady, true, "stays ready on a subsequent call, never reverts");
});
