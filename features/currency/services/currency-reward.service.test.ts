// Regression tests for the generic, reusable half of the currency/reward
// system — rollCurrencyReward (pure) and grantCurrencyRewards (the one
// place PlayerProfile.coins/gold are ever incremented). Runs the REAL
// functions unmodified against the in-memory fake DB
// (test/support/fakes/prisma.fake.ts) — see
// battle-action.service.persistence.test.ts's own header comment for why
// this project tests against a fake rather than a disposable database.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { grantCurrencyRewards, rollCurrencyReward, spendCurrency } from "./currency-reward.service.ts";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile, getPlayerProfileRow } from "../../../test/support/fakes/prisma.fake.ts";

function sequenceRandomSource(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

beforeEach(() => {
  resetFakeDb();
});

test("rollCurrencyReward returns null when the roll misses the drop chance", () => {
  // The very first draw (the chance check) landing exactly at/above
  // dropChance is a miss — see rollCurrencyReward's own `>=` comparison.
  const randomSource = sequenceRandomSource([0.5]);
  const result = rollCurrencyReward("money", { dropChance: 0.5, minAmount: 10, maxAmount: 20 }, randomSource);
  assert.equal(result, null);
});

test("rollCurrencyReward returns a reward with an amount inside [minAmount, maxAmount] when the roll hits", () => {
  // First draw (0.1) is well under a 0.5 dropChance -> hits. Second draw
  // (0.999999, clamped by the span math below) exercises the amount
  // roll's own upper edge.
  const randomSource = sequenceRandomSource([0.1, 0.999999]);
  const result = rollCurrencyReward("gold", { dropChance: 0.5, minAmount: 1, maxAmount: 5 }, randomSource);

  assert.ok(result);
  assert.equal(result.type, "gold");
  assert.equal(result.amount, 5, "a near-1.0 amount roll must land on maxAmount, never overflow past it");
});

test("rollCurrencyReward's amount roll can also land on the exact minAmount", () => {
  const randomSource = sequenceRandomSource([0, 0]);
  const result = rollCurrencyReward("money", { dropChance: 1, minAmount: 10, maxAmount: 60 }, randomSource);

  assert.ok(result);
  assert.equal(result.amount, 10);
});

test("a dropChance of 0 never rewards, no matter what the roll returns", () => {
  const randomSource = sequenceRandomSource([0]);
  const result = rollCurrencyReward("money", { dropChance: 0, minAmount: 10, maxAmount: 60 }, randomSource);
  assert.equal(result, null);
});

test("grantCurrencyRewards increments only the currencies actually present in the reward list", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 0 });

  await grantCurrencyRewards(prisma, "owner-1", [{ type: "money", amount: 30 }]);

  const row = getPlayerProfileRow("owner-1");
  assert.equal(row?.coins, 530);
  assert.equal(row?.gold, 0, "no gold reward was granted, so gold must stay untouched");
});

test("grantCurrencyRewards applies both currencies together when both are present", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 2 });

  await grantCurrencyRewards(prisma, "owner-1", [
    { type: "money", amount: 40 },
    { type: "gold", amount: 3 },
  ]);

  const row = getPlayerProfileRow("owner-1");
  assert.equal(row?.coins, 540);
  assert.equal(row?.gold, 5);
});

test("grantCurrencyRewards is a no-op for an empty reward list", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 0 });

  await grantCurrencyRewards(prisma, "owner-1", []);

  const row = getPlayerProfileRow("owner-1");
  assert.equal(row?.coins, 500);
  assert.equal(row?.gold, 0);
});

test("spendCurrency deducts the requested amount when the balance is sufficient", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 10 });

  const moneySpent = await spendCurrency(prisma, "owner-1", "money", 200);
  const goldSpent = await spendCurrency(prisma, "owner-1", "gold", 4);

  assert.equal(moneySpent, true);
  assert.equal(goldSpent, true);
  const row = getPlayerProfileRow("owner-1");
  assert.equal(row?.coins, 300);
  assert.equal(row?.gold, 6);
});

test("spendCurrency rejects and leaves the balance untouched when funds are insufficient", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 50, gold: 0 });

  const result = await spendCurrency(prisma, "owner-1", "money", 100);

  assert.equal(result, false);
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 50);
});

test("spendCurrency allows spending down to exactly zero", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 100, gold: 0 });

  const result = await spendCurrency(prisma, "owner-1", "money", 100);

  assert.equal(result, true);
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 0);
});

test("two racing spends against a balance that can only afford one can't both succeed", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 100, gold: 0 });

  const [first, second] = await Promise.all([
    spendCurrency(prisma, "owner-1", "money", 100),
    spendCurrency(prisma, "owner-1", "money", 100),
  ]);

  const successes = [first, second].filter(Boolean);
  assert.equal(successes.length, 1, "exactly one of the two racing spends should have won");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 0);
});
