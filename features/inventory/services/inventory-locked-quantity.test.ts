// MARKETPLACE PHASE 7 (cross-feature hardening) — focused coverage for
// removeInventoryItem's own lockedQuantity-awareness. This one function is
// the shared root every real consumption path in the game funnels through
// (Poké Ball throws, field/Gym battle potions, evolution items, chests,
// Shop sell-back) — hardening it here hardens every one of those call
// sites at once, with no per-caller changes needed. Runs the REAL function
// against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { removeInventoryItem } from "@/features/inventory/services/inventory.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedInventoryItem, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "player-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID });
});

test("an unlocked stack can still be fully consumed, exactly like before this hardening", async () => {
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "poke-ball", quantity: 10 });

  const removed = await prisma.$transaction((tx) => removeInventoryItem(tx, PLAYER_ID, "poke-ball", 10));
  assert.equal(removed, true);

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: PLAYER_ID, itemId: "poke-ball" } } });
  assert.equal(item, null, "quantity hitting zero still deletes the row, unchanged behavior");
});

test("consuming up to the AVAILABLE amount (quantity - lockedQuantity) still succeeds", async () => {
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "poke-ball", quantity: 10, lockedQuantity: 4 });

  const removed = await prisma.$transaction((tx) => removeInventoryItem(tx, PLAYER_ID, "poke-ball", 6));
  assert.equal(removed, true);

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: PLAYER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.quantity, 4);
  assert.equal(item?.lockedQuantity, 4, "lockedQuantity must never change from consumption — only the Marketplace lock/unlock own it");
});

test("consuming more than what's AVAILABLE is rejected, even though raw quantity would technically cover it", async () => {
  // 10 owned, but 8 are locked into a Marketplace listing — only 2 are
  // actually free. Trying to use/throw/sell 3 must fail.
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "poke-ball", quantity: 10, lockedQuantity: 8 });

  const removed = await prisma.$transaction((tx) => removeInventoryItem(tx, PLAYER_ID, "poke-ball", 3));
  assert.equal(removed, false, "must never consume Marketplace-locked quantity");

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: PLAYER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.quantity, 10, "a rejected consumption must leave raw quantity completely untouched");
  assert.equal(item?.lockedQuantity, 8);
});

test("a fully-locked stack (all owned quantity committed to a listing) cannot be consumed at all", async () => {
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "potion", quantity: 5, lockedQuantity: 5 });

  const removed = await prisma.$transaction((tx) => removeInventoryItem(tx, PLAYER_ID, "potion", 1));
  assert.equal(removed, false);
});

test("consuming exactly the available amount succeeds and leaves the locked remainder intact", async () => {
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "poke-ball", quantity: 10, lockedQuantity: 6 });

  const removed = await prisma.$transaction((tx) => removeInventoryItem(tx, PLAYER_ID, "poke-ball", 4));
  assert.equal(removed, true);

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: PLAYER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.quantity, 6);
  assert.equal(item?.lockedQuantity, 6, "the row survives (quantity 6 > 0) with its lock fully intact");
});

test("an unowned item is rejected cleanly (never throws, never touches anything)", async () => {
  const removed = await prisma.$transaction((tx) => removeInventoryItem(tx, PLAYER_ID, "no-such-item", 1));
  assert.equal(removed, false);
});
