// Regression tests for the Shop Purchase service — the one place a
// purchase is ever resolved: validate quantity/item, atomically deduct
// currency, credit inventory, and notify, all inside one transaction.
// Exercises success (both currencies), insufficient funds, invalid
// item/quantity, and a concurrency race against a balance that can only
// afford one of two simultaneous purchases — same "racing/retried call"
// precedent daily-battle-count.integration.test.ts already established for
// promoteToNextEncounter.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { purchaseShopItem } from "./shop-purchase.service.ts";
import {
  resetFakeDb,
  seedPlayerProfile,
  getPlayerProfileRow,
  getNotificationsFor,
  getInventoryItemRow,
} from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("a purchase with sufficient money deducts coins, credits inventory, and notifies", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 0 });

  const result = await purchaseShopItem("owner-1", "poke-ball", 3);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.quantity, 3);
  assert.equal(result.totalPrice, 300);
  assert.equal(result.currency, "money");

  const profile = getPlayerProfileRow("owner-1");
  assert.equal(profile?.coins, 200);
  assert.equal(profile?.gold, 0);

  assert.equal(getInventoryItemRow("owner-1", "poke-ball")?.quantity, 3);

  const notifications = getNotificationsFor("owner-1");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "SHOP_PURCHASE");
});

test("a purchase priced in gold deducts gold, never coins", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 200 });

  const result = await purchaseShopItem("owner-1", "master-ball", 2);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.totalPrice, 200);
  assert.equal(result.currency, "gold");

  const profile = getPlayerProfileRow("owner-1");
  assert.equal(profile?.coins, 500);
  assert.equal(profile?.gold, 0);
  assert.equal(getInventoryItemRow("owner-1", "master-ball")?.quantity, 2);
});

test("buying the same item twice accumulates inventory quantity", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 0 });

  await purchaseShopItem("owner-1", "potion", 2);
  await purchaseShopItem("owner-1", "potion", 1);

  assert.equal(getInventoryItemRow("owner-1", "potion")?.quantity, 3);
});

test("insufficient funds rejects the purchase and leaves currency/inventory unchanged", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 50, gold: 0 });

  const result = await purchaseShopItem("owner-1", "poke-ball", 1);

  assert.equal(result.status, "insufficient-funds");

  const profile = getPlayerProfileRow("owner-1");
  assert.equal(profile?.coins, 50);
  assert.equal(getInventoryItemRow("owner-1", "poke-ball"), undefined);
  assert.equal(getNotificationsFor("owner-1").length, 0);
});

test("an unknown item id is rejected without touching currency", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 0 });

  const result = await purchaseShopItem("owner-1", "not-a-real-item", 1);

  assert.equal(result.status, "invalid-item");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 500);
});

test("a zero or fractional quantity is rejected", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 0 });

  const zero = await purchaseShopItem("owner-1", "poke-ball", 0);
  const fractional = await purchaseShopItem("owner-1", "poke-ball", 1.5);

  assert.equal(zero.status, "invalid-quantity");
  assert.equal(fractional.status, "invalid-quantity");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 500);
});

test("two racing purchases against a balance that can only afford one can't both succeed", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 100, gold: 0 });

  const [first, second] = await Promise.all([
    purchaseShopItem("owner-1", "poke-ball", 1),
    purchaseShopItem("owner-1", "poke-ball", 1),
  ]);

  const successes = [first, second].filter((result) => result.status === "success");
  assert.equal(successes.length, 1, "exactly one of the two racing purchases should have won");

  const profile = getPlayerProfileRow("owner-1");
  assert.equal(profile?.coins, 0);
  assert.equal(getInventoryItemRow("owner-1", "poke-ball")?.quantity, 1);
});
