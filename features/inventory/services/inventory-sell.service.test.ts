// Regression tests for the Inventory Sell service — validate quantity/item,
// atomically deduct owned inventory, credit currency, and notify, all
// inside one transaction. Purchase-adds-inventory and repeated-purchase-
// increments-the-row are already covered by shop-purchase.service.test.ts
// (the shared addInventoryItem this sell path's counterpart also reuses),
// so this file only covers the sell-specific behaviors: the 50% price,
// currency-type correctness, multi-unit totals, over-selling rejection,
// zero-quantity row removal, and atomicity under a race.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { sellInventoryItem } from "./inventory-sell.service.ts";
import {
  resetFakeDb,
  seedPlayerProfile,
  seedInventoryItem,
  getPlayerProfileRow,
  getInventoryItemRow,
  getNotificationsFor,
} from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("selling returns exactly 50% of the unit purchase price", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  seedInventoryItem({ playerId: "owner-1", itemId: "poke-ball", quantity: 1 }); // buy price 100 money

  const result = await sellInventoryItem("owner-1", "poke-ball", 1);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.totalReturn, 50);
  assert.equal(result.currency, "money");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 50);

  const notifications = getNotificationsFor("owner-1");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "SHOP_SELL");
});

test("selling a gold-priced item credits gold, never money", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 0 });
  seedInventoryItem({ playerId: "owner-1", itemId: "master-ball", quantity: 1 }); // buy price 100 gold

  const result = await sellInventoryItem("owner-1", "master-ball", 1);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.totalReturn, 50);
  assert.equal(result.currency, "gold");

  const profile = getPlayerProfileRow("owner-1");
  assert.equal(profile?.gold, 50);
  assert.equal(profile?.coins, 500);
});

test("selling multiple units credits the correct total", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  seedInventoryItem({ playerId: "owner-1", itemId: "great-ball", quantity: 5 }); // buy price 200 money -> sell 100 each

  const result = await sellInventoryItem("owner-1", "great-ball", 3);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.totalReturn, 300);
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 300);
  assert.equal(getInventoryItemRow("owner-1", "great-ball")?.quantity, 2);
});

test("selling more than owned is rejected and leaves currency/inventory unchanged", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  seedInventoryItem({ playerId: "owner-1", itemId: "poke-ball", quantity: 2 });

  const result = await sellInventoryItem("owner-1", "poke-ball", 5);

  assert.equal(result.status, "insufficient-quantity");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 0);
  assert.equal(getInventoryItemRow("owner-1", "poke-ball")?.quantity, 2);
  assert.equal(getNotificationsFor("owner-1").length, 0);
});

test("selling the final quantity removes the inventory entry", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 0 });
  seedInventoryItem({ playerId: "owner-1", itemId: "fire-stone", quantity: 1 });

  const result = await sellInventoryItem("owner-1", "fire-stone", 1);

  assert.equal(result.status, "success");
  assert.equal(getInventoryItemRow("owner-1", "fire-stone"), undefined);
});

test("two racing sells against a stack that can only satisfy one can't both succeed", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  seedInventoryItem({ playerId: "owner-1", itemId: "poke-ball", quantity: 1 });

  const [first, second] = await Promise.all([
    sellInventoryItem("owner-1", "poke-ball", 1),
    sellInventoryItem("owner-1", "poke-ball", 1),
  ]);

  const successes = [first, second].filter((result) => result.status === "success");
  assert.equal(successes.length, 1, "exactly one of the two racing sells should have won");

  const profile = getPlayerProfileRow("owner-1");
  assert.equal(profile?.coins, 50, "currency credit must match exactly one sale, never zero or double");
  assert.equal(getInventoryItemRow("owner-1", "poke-ball"), undefined);
});
