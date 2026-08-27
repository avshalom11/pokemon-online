// MARKETPLACE PHASE 1 — focused coverage for the one "how much of this
// stackable item is actually available" primitive this phase introduces.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getAvailableInventoryQuantity, getAvailableQuantity } from "@/features/marketplace/services/inventory-availability.service";
import { resetFakeDb, seedInventoryItem } from "../../../test/support/fakes/prisma.fake.ts";

test("getAvailableQuantity: available = quantity - lockedQuantity", () => {
  assert.equal(getAvailableQuantity({ quantity: 10, lockedQuantity: 3 }), 7);
});

test("getAvailableQuantity: fully locked leaves zero available", () => {
  assert.equal(getAvailableQuantity({ quantity: 5, lockedQuantity: 5 }), 0);
});

test("getAvailableQuantity: no lock at all returns the full quantity", () => {
  assert.equal(getAvailableQuantity({ quantity: 8, lockedQuantity: 0 }), 8);
});

beforeEach(() => {
  resetFakeDb();
});

test("getAvailableInventoryQuantity: an unowned item returns 0, never null or negative", async () => {
  const available = await getAvailableInventoryQuantity("player-1", "poke-ball");
  assert.equal(available, 0);
});

test("getAvailableInventoryQuantity: an owned, unlocked stack returns the full quantity", async () => {
  seedInventoryItem({ playerId: "player-1", itemId: "poke-ball", quantity: 12 });
  const available = await getAvailableInventoryQuantity("player-1", "poke-ball");
  assert.equal(available, 12);
});

test("getAvailableInventoryQuantity: a partially-locked stack subtracts lockedQuantity", async () => {
  seedInventoryItem({ playerId: "player-1", itemId: "poke-ball", quantity: 12, lockedQuantity: 5 });
  const available = await getAvailableInventoryQuantity("player-1", "poke-ball");
  assert.equal(available, 7);
});

test("getAvailableInventoryQuantity: a fully-locked stack returns 0", async () => {
  seedInventoryItem({ playerId: "player-1", itemId: "poke-ball", quantity: 4, lockedQuantity: 4 });
  const available = await getAvailableInventoryQuantity("player-1", "poke-ball");
  assert.equal(available, 0);
});
