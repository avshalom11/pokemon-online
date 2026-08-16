// CHESTS PHASE 1 focused coverage for the chest ownership primitives —
// runs the real grantChest/consumeChest/listOwnedChests against the
// in-memory fake DB, same "real service, fake DB" shape every other
// persistence-layer test in this project already follows. No new fake DB
// support was needed: chests reuse the existing generic
// PlayerInventoryItem fake as-is.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { chestInventoryItemId, consumeChest, grantChest, listOwnedChests } from "./chest-ownership.service.ts";
import { getInventoryItemRow, resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

test("grantChest creates a new row with the granted quantity on first grant", async () => {
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "silver", 3));

  const row = getInventoryItemRow("owner-1", chestInventoryItemId("silver"));
  assert.equal(row?.quantity, 3);
});

test("grantChest defaults to quantity 1 when omitted", async () => {
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "gold"));

  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("gold"))?.quantity, 1);
});

test("multiple grants of the same chest type stack into one row, never duplicate unrelated rows", async () => {
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "diamond", 2));
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "diamond", 5));

  const row = getInventoryItemRow("owner-1", chestInventoryItemId("diamond"));
  assert.equal(row?.quantity, 7, "2 + 5 must stack into a single row's quantity");
});

test("different chest types remain fully separate rows/quantities", async () => {
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "silver", 4));
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "gold", 1));

  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver"))?.quantity, 4);
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("gold"))?.quantity, 1);
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("diamond")), undefined, "an ungranted type must have no row at all");
});

test("quantity persists across independent transactions (real DB persistence, not in-memory-only state)", async () => {
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "silver", 1));
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "silver", 1));
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "silver", 1));

  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver"))?.quantity, 3);
});

test("consumeChest atomically decrements one unit and reports success", async () => {
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "gold", 5));

  const consumed = await prisma.$transaction((tx) => consumeChest(tx, "owner-1", "gold", 1));

  assert.equal(consumed, true);
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("gold"))?.quantity, 4);
});

test("consumeChest never allows quantity to go negative — rejects when insufficient, leaves the row untouched", async () => {
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "silver", 1));

  const consumed = await prisma.$transaction((tx) => consumeChest(tx, "owner-1", "silver", 5));

  assert.equal(consumed, false);
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver"))?.quantity, 1, "an insufficient consume must not touch the row at all");
});

test("consumeChest on a chest type the player owns none of is rejected cleanly", async () => {
  const consumed = await prisma.$transaction((tx) => consumeChest(tx, "owner-1", "diamond", 1));
  assert.equal(consumed, false);
});

test("consuming the final unit removes the row entirely (never a stale zero-quantity row)", async () => {
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "diamond", 1));

  const consumed = await prisma.$transaction((tx) => consumeChest(tx, "owner-1", "diamond", 1));

  assert.equal(consumed, true);
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("diamond")), undefined);
});

test("two racing consumes against a single owned chest can't both succeed", async () => {
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "silver", 1));

  const [first, second] = await Promise.all([
    prisma.$transaction((tx) => consumeChest(tx, "owner-1", "silver", 1)),
    prisma.$transaction((tx) => consumeChest(tx, "owner-1", "silver", 1)),
  ]);

  const successes = [first, second].filter(Boolean);
  assert.equal(successes.length, 1, "exactly one of the two racing consumes should have won");
});

test("listOwnedChests returns only owned types, in catalog order, excluding zero-quantity types", async () => {
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "diamond", 2));
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "silver", 3));

  const owned = await listOwnedChests("owner-1");

  assert.deepEqual(
    owned.map((entry) => entry.chestTypeId),
    ["silver", "diamond"],
    "catalog order (silver, gold, diamond), not acquisition order"
  );
  assert.equal(owned.find((entry) => entry.chestTypeId === "silver")?.quantity, 3);
  assert.equal(owned.find((entry) => entry.chestTypeId === "diamond")?.quantity, 2);
});

test("listOwnedChests for a player who owns none returns an empty list, never a crash", async () => {
  const owned = await listOwnedChests("owner-1");
  assert.deepEqual(owned, []);
});

test("chest ownership for one player never leaks into another player's rows", async () => {
  seedPlayerProfile({ id: "owner-2" });
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "gold", 10));

  assert.equal(getInventoryItemRow("owner-2", chestInventoryItemId("gold")), undefined);
  assert.deepEqual(await listOwnedChests("owner-2"), []);
});

// CHESTS — SELL FROM INVENTORY — listOwnedChests must carry the exact
// current 50%-of-Shop-price sell value/currency per the spec's own table,
// derived live from the Shop catalog (features/shop/data/shop-items.ts's
// CHEST_PRICES), never a separate constant.
test("listOwnedChests carries the exact spec sell values: Silver 1,250 Coins, Gold 75 Gold, Diamond 125 Gold", async () => {
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "silver", 1));
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "gold", 1));
  await prisma.$transaction((tx) => grantChest(tx, "owner-1", "diamond", 1));

  const owned = await listOwnedChests("owner-1");
  const byType = Object.fromEntries(owned.map((entry) => [entry.chestTypeId, entry]));

  assert.equal(byType.silver.sellPrice, 1250);
  assert.equal(byType.silver.sellCurrency, "money");
  assert.equal(byType.gold.sellPrice, 75);
  assert.equal(byType.gold.sellCurrency, "gold");
  assert.equal(byType.diamond.sellPrice, 125);
  assert.equal(byType.diamond.sellCurrency, "gold");
});
