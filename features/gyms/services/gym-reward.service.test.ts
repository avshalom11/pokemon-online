// GYMS & LEAGUES PHASE 4 — focused coverage for reward granting (sections
// 12/13/15/17/19/20 of this Phase's spec): exact XP-percentage calculation,
// Gym Leader / Regional Champion victories granting exactly what the
// registry defines, and atomic/exactly-once reward protection under a
// duplicate/racing completion attempt. Runs the REAL executeGymBattleAction/
// startNpcBattle/markGymBattleCompleted unmodified against the in-memory
// fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

async function selectPartyFor(playerId: string, target: Parameters<typeof startNpcBattle>[1]): Promise<string[]> {
  const options = await getGymBattlePartyOptions(playerId, target);
  if (options.status !== "ok") return [];
  return options.options.filter((o) => !o.fainted).slice(0, options.requiredCount).map((o) => o.id);
}

import { getXpRequiredForNextLevel } from "@/features/player-progression/progression-calculations";
import { executeGymBattleAction } from "@/features/gyms/services/gym-battle-action.service";
import { startNpcBattle, getGymBattlePartyOptions } from "@/features/gyms/services/gym-battle-session.service";
import { markGymBattleCompleted, markRegionalChampionDefeated } from "@/features/gyms/services/gym-progression.service";
import { calculateGymRewardXp } from "@/features/gyms/services/gym-reward.service";
import { chestInventoryItemId } from "@/features/chests/services/chest-ownership.service";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
  getPlayerProfileRow,
  getInventoryItemRow,
  getGymBadgeRow,
  getRegionalMedalRow,
} from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
const MAX_ROLL = () => 0.999999;

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0 });
});

function seedOverwhelmingPlayer() {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
}

// XP DEFINITION (section 13) — a percentage of current-level -> next-level
// XP, computed from the SAME single curve every other XP reward already
// uses (getXpRequiredForNextLevel), never a second one.
test("calculateGymRewardXp derives its amount from getXpRequiredForNextLevel, never a separate curve", () => {
  const required = getXpRequiredForNextLevel(30);
  assert.equal(calculateGymRewardXp(30, 10), Math.floor(required * 0.1));
  assert.equal(calculateGymRewardXp(30, 50), Math.floor(required * 0.5));
});

async function winAllEasyMediumForLeader(regionId: string, gymNumber: 1 | 2 | 3) {
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, regionId as never, gymNumber, "easy");
    await markGymBattleCompleted(tx, PLAYER_ID, regionId as never, gymNumber, "medium");
  });
}

test("Easy victory gives no numeric reward — coins/experience untouched", async () => {
  seedOverwhelmingPlayer();
  const before = getPlayerProfileRow(PLAYER_ID)!;
  const started = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }));
  assert.equal(started.status, "started");

  let final;
  for (let i = 0; i < 3; i++) final = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  assert.equal((final as { victoryCompleted: boolean }).victoryCompleted, true);
  assert.equal((final as { reward?: unknown }).reward, undefined);

  const after = getPlayerProfileRow(PLAYER_ID)!;
  assert.equal(after.coins, before.coins);
  assert.equal(after.experience, before.experience);
});

test("Medium victory gives no numeric reward", async () => {
  seedOverwhelmingPlayer();
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy");
  });
  const before = getPlayerProfileRow(PLAYER_ID)!;
  const started = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "medium" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "medium" }));
  assert.equal(started.status, "started");

  let final;
  for (let i = 0; i < 4; i++) final = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  assert.equal((final as { victoryCompleted: boolean }).victoryCompleted, true);
  assert.equal((final as { reward?: unknown }).reward, undefined);

  const after = getPlayerProfileRow(PLAYER_ID)!;
  assert.equal(after.coins, before.coins);
  assert.equal(after.experience, before.experience);
});

test("Gym Leader victory gives Badge + exact Money + correct XP amount", async () => {
  seedOverwhelmingPlayer();
  await winAllEasyMediumForLeader("kanto", 1);
  const before = getPlayerProfileRow(PLAYER_ID)!;
  const expectedXp = calculateGymRewardXp(before.level, 10); // Kanto Gym 1: money 500, xp 10%

  const started = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }));
  assert.equal(started.status, "started");

  let final;
  for (let i = 0; i < 6; i++) final = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  const success = final as { victoryCompleted: boolean; reward?: { money: number; xpAmount: number; xpPercentOfNextLevel: number; badgeId?: string } };
  assert.equal(success.victoryCompleted, true);
  assert.ok(success.reward);
  assert.equal(success.reward!.money, 500);
  assert.equal(success.reward!.xpPercentOfNextLevel, 10);
  assert.equal(success.reward!.xpAmount, expectedXp);
  assert.equal(success.reward!.badgeId, "kanto-gym-1");

  const after = getPlayerProfileRow(PLAYER_ID)!;
  assert.equal(after.coins, before.coins + 500);
  assert.equal(after.experience, before.experience + expectedXp);
  assert.ok(getGymBadgeRow(PLAYER_ID, "kanto", 1));
});

test("Regional Champion victory gives Medal + exact Money + XP + Chests", async () => {
  seedOverwhelmingPlayer();
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 2, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 3, "leader");
  });
  const before = getPlayerProfileRow(PLAYER_ID)!;
  const expectedXp = calculateGymRewardXp(before.level, 40); // Kanto champion: money 2000, xp 40%, silver x1

  const started = await startNpcBattle(PLAYER_ID, { source: "regional-champion", regionId: "kanto" }, await selectPartyFor(PLAYER_ID, { source: "regional-champion", regionId: "kanto" }));
  assert.equal(started.status, "started");

  let final;
  for (let i = 0; i < 6; i++) final = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  const success = final as { victoryCompleted: boolean; reward?: { money: number; xpAmount: number; medalId?: string } };
  assert.equal(success.victoryCompleted, true);
  assert.ok(success.reward);
  assert.equal(success.reward!.money, 2000);
  assert.equal(success.reward!.xpAmount, expectedXp);
  assert.equal(success.reward!.medalId, "kanto-medal");

  const after = getPlayerProfileRow(PLAYER_ID)!;
  assert.equal(after.coins, before.coins + 2000);
  assert.equal(after.experience, before.experience + expectedXp);
  assert.ok(getRegionalMedalRow(PLAYER_ID, "kanto"));
  assert.equal(getInventoryItemRow(PLAYER_ID, chestInventoryItemId("silver"))?.quantity, 1);
});

// ATOMIC / ONE-TIME REWARD GRANTING (section 17) — the DB-level protection
// itself, tested directly against the primitive rather than trying to
// simulate a real network race: markGymBattleCompleted's own return value
// is exactly-once even when called twice for the same battle.
test("markGymBattleCompleted returns firstCompletion=true only once for the same battle — the reward gate", async () => {
  const first = await prisma.$transaction((tx) => markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "leader"));
  const second = await prisma.$transaction((tx) => markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "leader"));
  assert.equal(first, true);
  assert.equal(second, false);
});

test("markRegionalChampionDefeated returns firstDefeat=true only once for the same region", async () => {
  const first = await prisma.$transaction((tx) => markRegionalChampionDefeated(tx, PLAYER_ID, "kanto"));
  const second = await prisma.$transaction((tx) => markRegionalChampionDefeated(tx, PLAYER_ID, "kanto"));
  assert.equal(first, true);
  assert.equal(second, false);
});

test("completion and reward stay atomic: a duplicate/replayed winning action call cannot grant a second reward", async () => {
  seedOverwhelmingPlayer();
  await winAllEasyMediumForLeader("kanto", 1);
  const started = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }));
  assert.equal(started.status, "started");

  for (let i = 0; i < 6; i++) await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  const afterFirstWin = getPlayerProfileRow(PLAYER_ID)!;

  // The session is already gone — a replayed action call (the same
  // protection Phase 3 already guarantees) can't even reach the reward
  // path a second time.
  const replay = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  assert.deepEqual(replay, { status: "no-session" });

  const afterReplay = getPlayerProfileRow(PLAYER_ID)!;
  assert.equal(afterReplay.coins, afterFirstWin.coins, "no second money grant");
  assert.equal(afterReplay.experience, afterFirstWin.experience, "no second XP grant");
});
