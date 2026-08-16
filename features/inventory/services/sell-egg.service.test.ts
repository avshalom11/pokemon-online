// INVENTORY SELL (eggs) — regression tests for sellOwnedEgg: 50% of the
// egg's own live Shop price, works regardless of acquisition source,
// rejects a currently-incubating egg, rejects another player's egg, and is
// atomic under a race.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { sellOwnedEgg } from "./sell-egg.service.ts";
import { startIncubatingEgg } from "@/features/eggs/services/incubation.service";
import {
  getOwnedEggRow,
  getPlayerProfileRow,
  getNotificationsFor,
  resetFakeDb,
  seedIncubator,
  seedOwnedEgg,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("selling a common egg returns exactly 50% of its live Shop price (750 -> 375 Coins)", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });

  const result = await sellOwnedEgg("owner-1", egg.id);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.sellPrice, 375);
  assert.equal(result.currency, "money");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 375);
  assert.equal(getOwnedEggRow(egg.id), undefined, "the sold egg row must be gone");

  const notifications = getNotificationsFor("owner-1");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "SHOP_SELL");
});

test("selling a Gold-priced egg (very-rare: 100 gold -> 50) credits Gold, never Coins", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 500, gold: 0 });
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "very-rare", regionId: "kanto" });

  const result = await sellOwnedEgg("owner-1", egg.id);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.sellPrice, 50);
  assert.equal(result.currency, "gold");
  const profile = getPlayerProfileRow("owner-1");
  assert.equal(profile?.gold, 50);
  assert.equal(profile?.coins, 500, "coins must be untouched by a gold-priced sale");
});

test("selling a legendary egg returns exactly 50% of its live Shop price (200 -> 100 Gold)", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "legendary", regionId: "kanto" });

  const result = await sellOwnedEgg("owner-1", egg.id);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.sellPrice, 100);
  assert.equal(result.currency, "gold");
});

test("selling a rare egg returns exactly 50% of its live Shop price (2500 -> 1250 Coins)", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "rare", regionId: "kanto" });

  const result = await sellOwnedEgg("owner-1", egg.id);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.sellPrice, 1250);
  assert.equal(result.currency, "money");
});

// A battle-dropped egg must use the exact same market value as the
// equivalent Shop egg product — sellOwnedEgg only ever reads rarity, never
// source, so this is true by construction; asserted explicitly anyway as a
// regression guard.
test("a battle-dropped egg sells for the exact same price as the equivalent Shop egg product", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  const shopEgg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto", source: "shop" });
  const battleEgg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto", source: "battle" });

  const shopResult = await sellOwnedEgg("owner-1", shopEgg.id);
  const battleResult = await sellOwnedEgg("owner-1", battleEgg.id);

  assert.equal(shopResult.status, "success");
  assert.equal(battleResult.status, "success");
  if (shopResult.status !== "success" || battleResult.status !== "success") return;
  assert.equal(shopResult.sellPrice, battleResult.sellPrice);
  assert.equal(shopResult.currency, battleResult.currency);
});

test("an egg currently being incubated cannot be sold, and is left completely untouched", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });
  await startIncubatingEgg("owner-1", incubator.id, egg.id);

  const result = await sellOwnedEgg("owner-1", egg.id);

  assert.equal(result.status, "not-sellable");
  assert.ok(getOwnedEggRow(egg.id), "the incubating egg must still exist, untouched");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 0, "no currency must be granted for a rejected sale");
});

test("selling another player's egg is rejected, never silently allowed", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  seedPlayerProfile({ id: "owner-2", coins: 0, gold: 0 });
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });

  const result = await sellOwnedEgg("owner-2", egg.id);

  assert.equal(result.status, "not-sellable");
  assert.ok(getOwnedEggRow(egg.id), "the egg must remain owned by its real owner");
  assert.equal(getPlayerProfileRow("owner-2")?.coins, 0);
});

test("selling a nonexistent egg id is rejected cleanly", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });

  const result = await sellOwnedEgg("owner-1", "nope");
  assert.equal(result.status, "not-sellable");
});

test("two racing sells of the same egg can't both succeed — exactly one currency credit, never double", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });

  const [first, second] = await Promise.all([sellOwnedEgg("owner-1", egg.id), sellOwnedEgg("owner-1", egg.id)]);

  const successes = [first, second].filter((result) => result.status === "success");
  assert.equal(successes.length, 1, "exactly one of the two racing sells should have won");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 375, "currency credit must match exactly one sale, never zero or double");
});
