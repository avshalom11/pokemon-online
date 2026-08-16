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

// CHESTS — SELL FROM INVENTORY — chests need no dedicated sell service:
// chestInventoryItemId's "${type}-chest" convention is the exact same id
// the Shop catalog (features/shop/data/shop-items.ts) already uses for
// that chest product, and a chest's PlayerInventoryItem row is
// indistinguishable from an ordinary item's regardless of how it was
// acquired (Shop purchase or a battle drop both write through the same
// addInventoryItem) — so this existing generic service already covers
// every chest-sell requirement unmodified.
test("selling a chest returns exactly 50% of its current Shop price, per acquisition-source-agnostic ownership", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  // Simulates a chest owned via ANY source (Shop purchase or battle drop) —
  // both write through the same addInventoryItem, so the row looks
  // identical regardless of origin.
  seedInventoryItem({ playerId: "owner-1", itemId: "silver-chest", quantity: 2 }); // Shop price 2,500 money

  const result = await sellInventoryItem("owner-1", "silver-chest", 1);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.totalReturn, 1250);
  assert.equal(result.currency, "money");
  assert.equal(getInventoryItemRow("owner-1", "silver-chest")?.quantity, 1, "decrements by exactly 1, keeping the remaining stack");
});

test("selling Gold/Diamond chests matches the spec exactly: 75 Gold and 125 Gold", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  seedInventoryItem({ playerId: "owner-1", itemId: "gold-chest", quantity: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "diamond-chest", quantity: 1 });

  const gold = await sellInventoryItem("owner-1", "gold-chest", 1);
  const diamond = await sellInventoryItem("owner-1", "diamond-chest", 1);

  assert.equal(gold.status, "success");
  assert.equal(diamond.status, "success");
  if (gold.status !== "success" || diamond.status !== "success") return;
  assert.equal(gold.totalReturn, 75);
  assert.equal(diamond.totalReturn, 125);
  assert.equal(getPlayerProfileRow("owner-1")?.gold, 200);
});

test("selling the last owned chest removes the row (card disappears per existing inventory behavior)", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  seedInventoryItem({ playerId: "owner-1", itemId: "silver-chest", quantity: 1 });

  const result = await sellInventoryItem("owner-1", "silver-chest", 1);

  assert.equal(result.status, "success");
  assert.equal(getInventoryItemRow("owner-1", "silver-chest"), undefined);
});

test("selling a chest the player doesn't own is rejected, never going negative", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });

  const result = await sellInventoryItem("owner-1", "gold-chest", 1);

  assert.equal(result.status, "insufficient-quantity");
  assert.equal(getInventoryItemRow("owner-1", "gold-chest"), undefined);
});

test("two racing chest sells against a single owned chest can't both succeed", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  seedInventoryItem({ playerId: "owner-1", itemId: "silver-chest", quantity: 1 });

  const [first, second] = await Promise.all([
    sellInventoryItem("owner-1", "silver-chest", 1),
    sellInventoryItem("owner-1", "silver-chest", 1),
  ]);

  const successes = [first, second].filter((result) => result.status === "success");
  assert.equal(successes.length, 1, "exactly one of the two racing chest sells should have won");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 1250, "currency credit must match exactly one sale, never zero or double");
  assert.equal(getInventoryItemRow("owner-1", "silver-chest"), undefined);
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
