// CHESTS PHASE 5 focused coverage for the Shop's chest-purchase path —
// runs the real purchaseChestShopItem against the in-memory fake DB, same
// "real service, fake DB" shape incubator-shop-purchase.service.test.ts
// already establishes for its own sibling purchase path.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { purchaseChestShopItem } from "./chest-shop-purchase.service.ts";
import { chestInventoryItemId, listOwnedChests } from "@/features/chests/services/chest-ownership.service";
import { getInventoryItemRow, getPlayerProfileRow, resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("insufficient balance grants no chest and deducts nothing", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 100, gold: 0 }); // silver-chest costs 2,500

  const result = await purchaseChestShopItem("owner-1", "silver-chest", 1);

  assert.equal(result.status, "insufficient-funds");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 100, "coins must be untouched on a failed purchase");
  assert.deepEqual(await listOwnedChests("owner-1"), []);
});

test("a successful purchase deducts the exact price once and grants exactly one chest via grantChest", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 3000, gold: 0 });

  const result = await purchaseChestShopItem("owner-1", "silver-chest", 1);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.totalPrice, 2500);
  assert.equal(result.currency, "money");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 500, "3000 - 2500");
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver"))?.quantity, 1);
});

test("Gold costs 150 Gold and Diamond costs 250 Gold — exactly per the spec", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 1000 });

  const gold = await purchaseChestShopItem("owner-1", "gold-chest", 1);
  const diamond = await purchaseChestShopItem("owner-1", "diamond-chest", 1);

  assert.equal(gold.status, "success");
  assert.equal(diamond.status, "success");
  if (gold.status !== "success" || diamond.status !== "success") return;
  assert.equal(gold.totalPrice, 150);
  assert.equal(gold.currency, "gold");
  assert.equal(diamond.totalPrice, 250);
  assert.equal(diamond.currency, "gold");
  assert.equal(getPlayerProfileRow("owner-1")?.gold, 1000 - 150 - 250);
});

test("multiple purchases stack quantity correctly on the same stackable ownership row, never duplicate rows", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 20_000, gold: 0 });

  await purchaseChestShopItem("owner-1", "silver-chest", 1);
  await purchaseChestShopItem("owner-1", "silver-chest", 1);
  const result = await purchaseChestShopItem("owner-1", "silver-chest", 3);

  assert.equal(result.status, "success");
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver"))?.quantity, 5, "1 + 1 + 3 = 5, stacked on one row");
});

test("buying quantity 3 in a single purchase grants exactly 3 via one grantChest call, not three separate rows", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 1000 });

  const result = await purchaseChestShopItem("owner-1", "gold-chest", 3);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.totalPrice, 450);
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("gold"))?.quantity, 3);
});

test("an unrecognized item id is rejected as invalid, never silently granting a chest", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 10_000 });

  const result = await purchaseChestShopItem("owner-1", "poke-ball", 1);
  assert.equal(result.status, "invalid-item");
  assert.deepEqual(await listOwnedChests("owner-1"), []);
});

test("a zero/negative quantity is rejected before any currency check", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 10_000 });

  const result = await purchaseChestShopItem("owner-1", "silver-chest", 0);
  assert.equal(result.status, "invalid-quantity");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 10_000);
});
