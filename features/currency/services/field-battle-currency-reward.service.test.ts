// Regression tests for the field-battle-specific currency reward
// orchestrator — roll -> grant -> one notification per reward. Exercises
// all four documented outcomes (only money, only gold, both, neither) via
// a fully deterministic randomSource, against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { FIELD_BATTLE_CURRENCY_REWARD_CONFIG } from "@/features/currency/config/field-battle-currency-reward-config";
import { grantFieldBattleCurrencyRewards } from "./field-battle-currency-reward.service.ts";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile, getPlayerProfileRow, getNotificationsFor } from "../../../test/support/fakes/prisma.fake.ts";

function sequenceRandomSource(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

// Draws are consumed in this exact order (see rollCurrencyReward, called
// once for "money" then once for "gold"): [money-chance, money-amount,
// gold-chance, gold-amount]. A HIT_ROLL below dropChance always hits; a
// MISS_ROLL of 0.999999 always misses both currencies' dropChance
// (0.85 and 0.05 — see FIELD_BATTLE_CURRENCY_REWARD_CONFIG).
const HIT_ROLL = 0;
const MISS_ROLL = 0.999999;

beforeEach(() => {
  resetFakeDb();
});

test("both currencies can be granted together, each with its own notification", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 0 });
  const randomSource = sequenceRandomSource([HIT_ROLL, HIT_ROLL, HIT_ROLL, HIT_ROLL]);

  const rewards = await prisma.$transaction((tx) => grantFieldBattleCurrencyRewards(tx, "owner-1", "Pikachu", randomSource));

  assert.equal(rewards.length, 2);
  assert.deepEqual(
    rewards.map((r) => r.type).sort(),
    ["gold", "money"]
  );

  const profile = getPlayerProfileRow("owner-1");
  const expectedMoney = FIELD_BATTLE_CURRENCY_REWARD_CONFIG.money.minAmount;
  const expectedGold = FIELD_BATTLE_CURRENCY_REWARD_CONFIG.gold.minAmount;
  assert.equal(profile?.coins, 500 + expectedMoney);
  assert.equal(profile?.gold, 0 + expectedGold);

  // One notification per reward — never a single combined "money and
  // gold" message.
  const created = getNotificationsFor("owner-1");
  assert.equal(created.length, 2);
  const moneyNotification = created.find((n) => n.type === "CURRENCY_MONEY_REWARD");
  const goldNotification = created.find((n) => n.type === "CURRENCY_GOLD_REWARD");
  assert.ok(moneyNotification?.message.includes("Pikachu"));
  assert.ok(moneyNotification?.message.includes(String(expectedMoney)));
  assert.ok(goldNotification?.message.includes(String(expectedGold)));
});

test("only money can be granted while gold misses its drop chance", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 0 });
  const randomSource = sequenceRandomSource([HIT_ROLL, HIT_ROLL, MISS_ROLL]);

  const rewards = await prisma.$transaction((tx) => grantFieldBattleCurrencyRewards(tx, "owner-1", "Pikachu", randomSource));

  assert.equal(rewards.length, 1);
  assert.equal(rewards[0].type, "money");

  const profile = getPlayerProfileRow("owner-1");
  assert.ok(profile && profile.coins > 500);
  assert.equal(profile?.gold, 0);
});

test("only gold can be granted while money misses its drop chance", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 0 });
  const randomSource = sequenceRandomSource([MISS_ROLL, HIT_ROLL, HIT_ROLL]);

  const rewards = await prisma.$transaction((tx) => grantFieldBattleCurrencyRewards(tx, "owner-1", "Pikachu", randomSource));

  assert.equal(rewards.length, 1);
  assert.equal(rewards[0].type, "gold");

  const profile = getPlayerProfileRow("owner-1");
  assert.equal(profile?.coins, 500);
  assert.ok(profile && profile.gold > 0);
});

test("a battle can reward nothing at all when both currencies miss", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 0 });
  const randomSource = sequenceRandomSource([MISS_ROLL, MISS_ROLL]);

  const rewards = await prisma.$transaction((tx) => grantFieldBattleCurrencyRewards(tx, "owner-1", "Pikachu", randomSource));

  assert.deepEqual(rewards, []);

  const profile = getPlayerProfileRow("owner-1");
  assert.equal(profile?.coins, 500);
  assert.equal(profile?.gold, 0);
});
