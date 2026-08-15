// EGGS PHASE 6 focused coverage for the Shop's egg-purchase path — runs
// the real purchaseEggShopItem against the in-memory fake DB, same "real
// service, fake DB" shape every other persistence-layer test in this
// project already follows.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { purchaseEggShopItem } from "./egg-shop-purchase.service.ts";
import { listOwnedEggs } from "@/features/eggs/services/egg-ownership.service";
import { getPlayerProfileRow, resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("insufficient balance creates no egg and deducts nothing", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 100, gold: 0 }); // common-egg costs 750

  const result = await purchaseEggShopItem("owner-1", "common-egg", 1);

  assert.equal(result.status, "insufficient-funds");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 100, "coins must be untouched on a failed purchase");
  assert.deepEqual(await listOwnedEggs("owner-1"), []);
});

test("a successful purchase deducts the exact price once and creates exactly one egg", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 1000, gold: 0 });

  const result = await purchaseEggShopItem("owner-1", "common-egg", 1);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.totalPrice, 750);
  assert.equal(result.currency, "money");
  assert.equal(result.eggIds.length, 1);

  assert.equal(getPlayerProfileRow("owner-1")?.coins, 250, "1000 - 750");

  const eggs = await listOwnedEggs("owner-1");
  assert.equal(eggs.length, 1);
});

test("the purchased egg stores the player's CURRENT regionId, never a fixed/default region", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 1000, gold: 0, regionId: "johto" });

  await purchaseEggShopItem("owner-1", "common-egg", 1);

  const [egg] = await listOwnedEggs("owner-1");
  assert.equal(egg.regionId, "johto");
});

test("the purchased egg's source is 'shop'", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 1000, gold: 0 });

  await purchaseEggShopItem("owner-1", "common-egg", 1);

  const [egg] = await listOwnedEggs("owner-1");
  assert.equal(egg.source, "shop");
});

test("the purchased egg's rarity matches the product bought", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 10_000 });

  await purchaseEggShopItem("owner-1", "rare-egg", 1);

  const [egg] = await listOwnedEggs("owner-1");
  assert.equal(egg.rarity, "rare");
});

test("Common and Rare eggs deduct Coins; Very Rare and Legendary deduct Gold", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 10_000 });

  await purchaseEggShopItem("owner-1", "common-egg", 1);
  await purchaseEggShopItem("owner-1", "rare-egg", 1);
  const afterCoinsPurchases = getPlayerProfileRow("owner-1");
  assert.equal(afterCoinsPurchases?.gold, 10_000, "gold must be untouched by Coin-priced eggs");
  assert.ok((afterCoinsPurchases?.coins ?? 0) < 10_000, "coins must have been spent");

  await purchaseEggShopItem("owner-1", "very-rare-egg", 1);
  await purchaseEggShopItem("owner-1", "legendary-egg", 1);
  const afterGoldPurchases = getPlayerProfileRow("owner-1");
  assert.equal(afterGoldPurchases?.coins, afterCoinsPurchases?.coins, "coins must be untouched by Gold-priced eggs");
  assert.ok((afterGoldPurchases?.gold ?? 0) < 10_000, "gold must have been spent");
});

test("multiple purchased eggs of the same rarity/region remain separate owned egg rows, never a stacked quantity", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 0 });

  const result = await purchaseEggShopItem("owner-1", "common-egg", 3);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.eggIds.length, 3);
  assert.equal(new Set(result.eggIds).size, 3, "each egg must have its own unique id");

  const eggs = await listOwnedEggs("owner-1");
  assert.equal(eggs.length, 3);
});

test("an unrecognized item id is rejected as invalid, never silently creating an egg", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 10_000 });

  const result = await purchaseEggShopItem("owner-1", "poke-ball", 1);
  assert.equal(result.status, "invalid-item", "poke-ball is a real item but not an egg product");
  assert.deepEqual(await listOwnedEggs("owner-1"), []);
});

test("a zero/negative quantity is rejected before any currency check", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 10_000 });

  const result = await purchaseEggShopItem("owner-1", "common-egg", 0);
  assert.equal(result.status, "invalid-quantity");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 10_000);
});
