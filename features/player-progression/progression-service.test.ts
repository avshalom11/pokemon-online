// PLAYER LEVEL-UP REWARDS — focused coverage for addPlayerExperience's own
// Money/Gold granting (progression-service.ts). Runs the REAL
// addPlayerExperience unmodified against the in-memory fake DB, same
// convention as gym-reward.service.test.ts/league-reward.service.test.ts.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { addPlayerExperience } from "./progression-service.ts";
import { getTotalXpRequiredForLevel } from "./progression-calculations.ts";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile, getPlayerProfileRow } from "../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "player-1";

beforeEach(() => {
  resetFakeDb();
});

async function grantXp(playerId: string, xpAmount: number) {
  return prisma.$transaction((tx) => addPlayerExperience(tx, playerId, xpAmount));
}

test("no level crossed: moneyReward/goldReward are 0, and coins/gold are left untouched", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 1, experience: 0, coins: 500, gold: 0 });

  const result = await grantXp(PLAYER_ID, 10);

  assert.equal(result.leveledUp, false);
  assert.equal(result.moneyReward, 0);
  assert.equal(result.goldReward, 0);

  const row = getPlayerProfileRow(PLAYER_ID)!;
  assert.equal(row.coins, 500);
  assert.equal(row.gold, 0);
});

test("single level up (1 -> 2) grants exactly the level-2 tier: 1,500 money + 20 gold", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 1, experience: 0, coins: 500, gold: 0 });

  const result = await grantXp(PLAYER_ID, getTotalXpRequiredForLevel(2));

  assert.equal(result.leveledUp, true);
  assert.equal(result.newLevel, 2);
  assert.equal(result.moneyReward, 1500);
  assert.equal(result.goldReward, 20);

  const row = getPlayerProfileRow(PLAYER_ID)!;
  assert.equal(row.coins, 500 + 1500);
  assert.equal(row.gold, 0 + 20);
});

// MULTI-LEVEL JUMP ACROSS A TIER BOUNDARY — one XP grant that jumps from
// level 9 straight to level 11 must sum BOTH crossed levels' own tiers
// (level 10: 1,500/20 from the 2-10 bracket; level 11: 1,750/22 from the
// 11-20 bracket), never just the final level's tier alone.
test("multi-level jump crossing a tier boundary (9 -> 11) sums each crossed level's own tier", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 9, experience: getTotalXpRequiredForLevel(9), coins: 500, gold: 0 });

  const xpForLevel11 = getTotalXpRequiredForLevel(11) - getTotalXpRequiredForLevel(9);
  const result = await grantXp(PLAYER_ID, xpForLevel11);

  assert.equal(result.leveledUp, true);
  assert.equal(result.newLevel, 11);
  assert.equal(result.moneyReward, 1500 + 1750);
  assert.equal(result.goldReward, 20 + 22);

  const row = getPlayerProfileRow(PLAYER_ID)!;
  assert.equal(row.coins, 500 + 1500 + 1750);
  assert.equal(row.gold, 20 + 22);
});

test("the 55+ tier (3,500 money + 35 gold) applies once the player reaches level 55", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 54, experience: getTotalXpRequiredForLevel(54), coins: 0, gold: 0 });

  const xpForLevel55 = getTotalXpRequiredForLevel(55) - getTotalXpRequiredForLevel(54);
  const result = await grantXp(PLAYER_ID, xpForLevel55);

  assert.equal(result.newLevel, 55);
  assert.equal(result.moneyReward, 3500);
  assert.equal(result.goldReward, 35);
});
