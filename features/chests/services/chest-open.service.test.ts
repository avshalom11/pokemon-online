// CHESTS PHASE 3 — focused coverage for openChest: ownership + consumption
// + reward rolling + granting, all inside one atomic transaction. All
// deterministic via injected randomSource/rewardsOverride — never
// statistical/flaky.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { chestInventoryItemId, grantChest } from "./chest-ownership.service.ts";
import { openChest } from "./chest-open.service.ts";
import { rollChestReward } from "./chest-reward-roll.service.ts";
import { CHEST_REWARD_CONFIGS } from "../data/chest-reward-config.ts";
import { listOwnedEggs } from "@/features/eggs/services/egg-ownership.service";
import { listPlayerIncubators } from "@/features/eggs/services/incubator.service";
import {
  getInventoryItemRow,
  getNotificationsFor,
  getPlayerProfileRow,
  resetFakeDb,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";
import { paddedRandom } from "../../../test/support/deterministic-random.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
});

async function seedChests(playerId: string, chestTypeId: "silver" | "gold" | "diamond", quantity: number) {
  await prisma.$transaction((tx) => grantChest(tx, playerId, chestTypeId, quantity));
}

test("opening an owned chest consumes exactly one, leaving the rest untouched", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  await seedChests("owner-1", "silver", 3);

  const result = await openChest("owner-1", "silver", { randomSource: paddedRandom([], 0.9) });

  assert.equal(result.status, "success");
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver"))?.quantity, 2);
});

test("opening without owning any chest of that type fails cleanly, nothing granted", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 100, gold: 100 });

  const result = await openChest("owner-1", "silver", { randomSource: paddedRandom([], 0.9) });

  assert.equal(result.status, "not-enough-chests");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 100, "no currency granted on a rejected open");
  assert.equal(getPlayerProfileRow("owner-1")?.gold, 100);
  assert.equal(getNotificationsFor("owner-1").length, 0);
});

test("chest quantity never goes negative — opening the last chest, then opening again, is safely rejected", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  await seedChests("owner-1", "silver", 1);

  const first = await openChest("owner-1", "silver", { randomSource: paddedRandom([], 0.9) });
  assert.equal(first.status, "success");
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver")), undefined, "the final unit removes the row entirely, never a negative/zero row");

  const second = await openChest("owner-1", "silver", { randomSource: paddedRandom([], 0.9) });
  assert.equal(second.status, "not-enough-chests");
});

test("every reward category rollChestReward would produce is actually granted, matching exactly", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0, regionId: "kanto" });
  await seedChests("owner-1", "diamond", 1);

  // Same deterministic sequence fed to both the reference roll and the
  // real open — proves openChest's own granted categories match
  // rollChestReward's own output exactly, one-for-one.
  const expected = rollChestReward("diamond", paddedRandom([], 0));
  const result = await openChest("owner-1", "diamond", { randomSource: paddedRandom([], 0) });

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.deepEqual(
    result.rewards.map((reward) => reward.category),
    expected.map((reward) => reward.category)
  );
});

test("Money is granted via the real currency system for the exact rolled amount", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 1000, gold: 0 });
  await seedChests("owner-1", "silver", 1);

  const result = await openChest("owner-1", "silver", { randomSource: paddedRandom([0, 0], 0.9) }); // egg=common, money min=500
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const moneyReward = result.rewards.find((r) => r.category === "money");
  assert.ok(moneyReward);
  if (moneyReward?.category !== "money") return;
  assert.equal(moneyReward.amount, 500);
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 1500, "1000 + 500 rolled");
});

test("Gold is granted via the real currency system for the exact rolled amount", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 200 });
  await seedChests("owner-1", "silver", 1);

  const result = await openChest("owner-1", "silver", { randomSource: paddedRandom([0, 0, 0], 0.9) }); // gold min=1
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const goldReward = result.rewards.find((r) => r.category === "gold");
  assert.ok(goldReward);
  if (goldReward?.category !== "gold") return;
  assert.equal(goldReward.amount, 1);
  assert.equal(getPlayerProfileRow("owner-1")?.gold, 201, "200 + 1 rolled");
});

test("an item bundle reward (Poké Balls/Potions/Revive) is granted via the real inventory primitive with the exact itemId/quantity", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  await seedChests("owner-1", "diamond", 1);

  // Diamond all-0 path's own first mandatory extra is poke-balls
  // (great-ball x4) — see Phase 2's own exact-vector test.
  const result = await openChest("owner-1", "diamond", { randomSource: paddedRandom([], 0) });
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const pokeBallsReward = result.rewards.find((r) => r.category === "poke-balls");
  assert.ok(pokeBallsReward);
  if (pokeBallsReward?.category !== "poke-balls") return;
  assert.equal(pokeBallsReward.itemId, "great-ball");
  assert.equal(pokeBallsReward.quantity, 4);
  assert.equal(getInventoryItemRow("owner-1", "great-ball")?.quantity, 4);
});

test("an incubator reward is granted via the real grantIncubator primitive", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  await seedChests("owner-1", "diamond", 1);

  const result = await openChest("owner-1", "diamond", { randomSource: paddedRandom([], 0) }); // incubator: ultra
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const incubatorReward = result.rewards.find((r) => r.category === "incubator");
  assert.ok(incubatorReward);
  if (incubatorReward?.category !== "incubator") return;
  assert.equal(incubatorReward.incubatorTypeId, "ultra");

  const owned = await listPlayerIncubators("owner-1");
  assert.equal(owned.length, 1);
  assert.equal(owned[0].id, incubatorReward.playerIncubatorId);
  assert.equal(owned[0].incubatorTypeId, "ultra");
});

test("a chest-granted incubator is consumable (permanentSlot: null), never the permanent starter slot", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  await seedChests("owner-1", "diamond", 1);

  await openChest("owner-1", "diamond", { randomSource: paddedRandom([], 0) });

  const owned = await listPlayerIncubators("owner-1");
  assert.equal(owned.length, 1);
  assert.equal(owned[0].permanentSlot, null, "must be consumable, identical in ownership behavior to a purchased consumable incubator");
});

test("an egg reward creates a real PlayerOwnedEgg row, with the rarity from the reward roll", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0, regionId: "kanto" });
  await seedChests("owner-1", "diamond", 1);

  const result = await openChest("owner-1", "diamond", { randomSource: paddedRandom([], 0) }); // egg: legendary
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const eggReward = result.rewards.find((r) => r.category === "egg");
  assert.ok(eggReward);
  if (eggReward?.category !== "egg") return;
  assert.equal(eggReward.rarity, "legendary");

  const owned = await listOwnedEggs("owner-1");
  assert.equal(owned.length, 1);
  assert.equal(owned[0].id, eggReward.ownedEggId);
  assert.equal(owned[0].rarity, "legendary");
});

test("an egg reward's source is always 'chest'", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  await seedChests("owner-1", "silver", 1);

  await openChest("owner-1", "silver", { randomSource: paddedRandom([], 0.9) });

  const [egg] = await listOwnedEggs("owner-1");
  assert.equal(egg.source, "chest");
});

test("an egg reward's region is the player's CURRENT region at open time", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0, regionId: "johto" });
  await seedChests("owner-1", "silver", 1);

  await openChest("owner-1", "silver", { randomSource: paddedRandom([], 0.9) });

  const [egg] = await listOwnedEggs("owner-1");
  assert.equal(egg.regionId, "johto");
});

test("different players' current regions produce different egg regionIds from the same chest tier", async () => {
  seedPlayerProfile({ id: "owner-kanto", coins: 0, gold: 0, regionId: "kanto" });
  seedPlayerProfile({ id: "owner-hoenn", coins: 0, gold: 0, regionId: "hoenn" });
  await seedChests("owner-kanto", "silver", 1);
  await seedChests("owner-hoenn", "silver", 1);

  await openChest("owner-kanto", "silver", { randomSource: paddedRandom([], 0.9) });
  await openChest("owner-hoenn", "silver", { randomSource: paddedRandom([], 0.9) });

  const [kantoEgg] = await listOwnedEggs("owner-kanto");
  const [hoennEgg] = await listOwnedEggs("owner-hoenn");
  assert.equal(kantoEgg.regionId, "kanto");
  assert.equal(hoennEgg.regionId, "hoenn");
});

test("an evolution-item bundle grants EVERY distinct rolled item, each its own inventory row", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  await seedChests("owner-1", "diamond", 1);

  // Diamond all-0.999999 path's own mandatory extras are incubator +
  // evolution-item (3 items: reaper-cloth, protector, shiny-stone) — see
  // Phase 2's own exact-vector test.
  const result = await openChest("owner-1", "diamond", { randomSource: paddedRandom([], 0.999999) });
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const evolutionReward = result.rewards.find((r) => r.category === "evolution-item");
  assert.ok(evolutionReward);
  if (evolutionReward?.category !== "evolution-item") return;
  assert.equal(evolutionReward.items.length, 3);

  for (const item of evolutionReward.items) {
    assert.equal(getInventoryItemRow("owner-1", item.itemId)?.quantity, item.quantity);
  }
});

test("an injected failure partway through granting rolls back the ALREADY-consumed chest", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  await seedChests("owner-1", "silver", 1);

  const badRewards = [
    { category: "money" as const, amount: 500 },
    { category: "poke-balls" as const, itemId: "not-a-real-item", quantity: 3 },
  ];

  await assert.rejects(() => openChest("owner-1", "silver", { rewardsOverride: badRewards }));

  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver"))?.quantity, 1, "the chest must NOT remain consumed");
});

test("an injected failure partway through granting leaves NO partial rewards — even the reward listed BEFORE the failing one", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 1000, gold: 0 });
  await seedChests("owner-1", "silver", 1);

  const badRewards = [
    { category: "money" as const, amount: 500 }, // would succeed if applied
    { category: "poke-balls" as const, itemId: "not-a-real-item", quantity: 3 }, // throws
  ];

  await assert.rejects(() => openChest("owner-1", "silver", { rewardsOverride: badRewards }));

  assert.equal(getPlayerProfileRow("owner-1")?.coins, 1000, "the money reward that succeeded before the failure must also be rolled back");
  assert.equal(getNotificationsFor("owner-1").length, 0, "no notification for a failed opening");
});

test("two racing opens against the last remaining chest can't both succeed", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
  await seedChests("owner-1", "silver", 1);

  const [first, second] = await Promise.all([
    openChest("owner-1", "silver", { randomSource: paddedRandom([], 0.9) }),
    openChest("owner-1", "silver", { randomSource: paddedRandom([], 0.9) }),
  ]);

  const statuses = [first.status, second.status].sort();
  assert.deepEqual(statuses, ["not-enough-chests", "success"]);
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver")), undefined, "exactly one chest consumed, none left");
});

test("a successful open returns a complete, structured result — chestTypeId plus every reward's own display info", async () => {
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0, regionId: "kanto" });
  await seedChests("owner-1", "silver", 1);

  const result = await openChest("owner-1", "silver", { randomSource: paddedRandom([], 0.9) });

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.chestTypeId, "silver");
  assert.equal(result.rewards.length, 3, "the minimum-path 3 mandatory categories");

  const egg = result.rewards.find((r) => r.category === "egg");
  if (egg?.category === "egg") {
    assert.ok(egg.displayName.length > 0);
    assert.ok(egg.imageUrl.length > 0);
    assert.equal(egg.regionId, "kanto");
  }

  const notifications = getNotificationsFor("owner-1");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "CHEST_OPENED");
});

test("Phase 2's own reward weights/config were not modified by this phase", () => {
  assert.deepEqual(CHEST_REWARD_CONFIGS.silver.eggWeights, [
    ["common", 0.8],
    ["rare", 0.2],
  ]);
  assert.deepEqual(CHEST_REWARD_CONFIGS.silver.moneyRange, { min: 500, max: 1500 });
  assert.deepEqual(CHEST_REWARD_CONFIGS.silver.goldRange, { min: 1, max: 5 });
  assert.equal(CHEST_REWARD_CONFIGS.silver.mandatoryExtraCount, 0);
  assert.equal(CHEST_REWARD_CONFIGS.silver.bonusCap, 2);

  assert.deepEqual(CHEST_REWARD_CONFIGS.gold.moneyRange, { min: 2000, max: 5000 });
  assert.deepEqual(CHEST_REWARD_CONFIGS.gold.goldRange, { min: 15, max: 30 });
  assert.equal(CHEST_REWARD_CONFIGS.gold.mandatoryExtraCount, 1);
  assert.equal(CHEST_REWARD_CONFIGS.gold.bonusCap, 3);

  assert.deepEqual(CHEST_REWARD_CONFIGS.diamond.eggWeights, [["legendary", 1]]);
  assert.deepEqual(CHEST_REWARD_CONFIGS.diamond.moneyRange, { min: 7500, max: 10000 });
  assert.deepEqual(CHEST_REWARD_CONFIGS.diamond.goldRange, { min: 50, max: 90 });
  assert.equal(CHEST_REWARD_CONFIGS.diamond.mandatoryExtraCount, 2);
  assert.equal(CHEST_REWARD_CONFIGS.diamond.bonusCap, null);
});
