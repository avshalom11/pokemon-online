// INCUBATOR EXPANSION focused coverage for the Shop's incubator-purchase
// path — runs the real purchaseIncubatorShopItem against the in-memory
// fake DB, same "real service, fake DB" shape egg-shop-purchase.service.test.ts
// already establishes for its own sibling purchase path.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { purchaseIncubatorShopItem } from "./incubator-shop-purchase.service.ts";
import { listPlayerIncubators } from "@/features/eggs/services/incubator.service";
import { getIncubatorRows, getPlayerProfileRow, resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("insufficient balance grants no incubator and deducts nothing", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 100, gold: 0 }); // regular-incubator costs 700

  const result = await purchaseIncubatorShopItem("owner-1", "regular-incubator", 1);

  assert.equal(result.status, "insufficient-funds");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 100, "coins must be untouched on a failed purchase");
  assert.deepEqual(getIncubatorRows("owner-1"), []);
});

test("a successful purchase deducts the exact price once and grants exactly one consumable incubator", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 1000, gold: 0 });

  const result = await purchaseIncubatorShopItem("owner-1", "regular-incubator", 1);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.totalPrice, 700);
  assert.equal(result.currency, "money");

  assert.equal(getPlayerProfileRow("owner-1")?.coins, 300, "1000 - 700");

  const incubators = await listPlayerIncubators("owner-1");
  assert.equal(incubators.length, 1);
  assert.equal(incubators[0].incubatorTypeId, "regular");
  assert.equal(incubators[0].permanentSlot, null, "a purchased incubator is always consumable, never the permanent slot");
});

test("Regular costs 700 Coins, Advanced costs 1500 Coins, Ultra costs 50 Gold, Master costs 80 Gold — exactly per the spec", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 10_000 });

  const regular = await purchaseIncubatorShopItem("owner-1", "regular-incubator", 1);
  const advanced = await purchaseIncubatorShopItem("owner-1", "advanced-incubator", 1);
  const ultra = await purchaseIncubatorShopItem("owner-1", "ultra-incubator", 1);
  const master = await purchaseIncubatorShopItem("owner-1", "master-incubator", 1);

  for (const result of [regular, advanced, ultra, master]) assert.equal(result.status, "success");
  if (regular.status !== "success" || advanced.status !== "success" || ultra.status !== "success" || master.status !== "success") return;

  assert.equal(regular.totalPrice, 700);
  assert.equal(regular.currency, "money");
  assert.equal(advanced.totalPrice, 1500);
  assert.equal(advanced.currency, "money");
  assert.equal(ultra.totalPrice, 50);
  assert.equal(ultra.currency, "gold");
  assert.equal(master.totalPrice, 80);
  assert.equal(master.currency, "gold");

  assert.equal(getPlayerProfileRow("owner-1")?.coins, 10_000 - 700 - 1500);
  assert.equal(getPlayerProfileRow("owner-1")?.gold, 10_000 - 50 - 80);
});

test("multiple purchased incubators of the same type remain separate owned instances, never a stacked quantity", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 0 });

  const result = await purchaseIncubatorShopItem("owner-1", "regular-incubator", 3);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const rows = getIncubatorRows("owner-1");
  assert.equal(rows.length, 3);
  assert.equal(new Set(rows.map((row) => row.id)).size, 3, "each purchased incubator must have its own unique id");
  assert.ok(rows.every((row) => row.permanentSlot === null));
});

test("a purchased incubator coexists with the player's own permanent starter incubator without colliding", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 0 });

  const result = await purchaseIncubatorShopItem("owner-1", "regular-incubator", 1);
  assert.equal(result.status, "success");

  // Simulate the player's permanent starter incubator already existing.
  const { ensureStarterIncubator } = await import("@/features/eggs/services/incubator.service");
  await ensureStarterIncubator("owner-1");

  const rows = getIncubatorRows("owner-1");
  assert.equal(rows.length, 2);
  assert.equal(rows.filter((row) => row.permanentSlot === 1).length, 1);
  assert.equal(rows.filter((row) => row.permanentSlot === null).length, 1);
});

test("an unrecognized item id is rejected as invalid, never silently granting an incubator", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 10_000 });

  const result = await purchaseIncubatorShopItem("owner-1", "poke-ball", 1);
  assert.equal(result.status, "invalid-item", "poke-ball is a real item but not an incubator product");
  assert.deepEqual(getIncubatorRows("owner-1"), []);
});

test("an egg product id is rejected as invalid here too — incubator purchases stay on their own dedicated path", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 10_000 });

  const result = await purchaseIncubatorShopItem("owner-1", "common-egg", 1);
  assert.equal(result.status, "invalid-item");
});

test("a zero/negative quantity is rejected before any currency check", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 10_000 });

  const result = await purchaseIncubatorShopItem("owner-1", "regular-incubator", 0);
  assert.equal(result.status, "invalid-quantity");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 10_000);
});

test("purchase is transactional — a mid-grant failure would leave neither a currency deduction nor a partial grant (verified via a failed balance check up front)", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 699, gold: 0 }); // one short of Regular's 700 price

  const result = await purchaseIncubatorShopItem("owner-1", "regular-incubator", 1);

  assert.equal(result.status, "insufficient-funds");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 699, "no partial deduction");
  assert.deepEqual(getIncubatorRows("owner-1"), [], "no partial grant");
});
