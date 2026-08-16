// INVENTORY SELL (incubators) — regression tests for sellOwnedIncubator:
// 50% of the type's live Shop price, permanent starter is never sellable,
// an incubator currently holding an active incubation is never sellable,
// exactly one instance of a grouped type is removed per sale, and the
// operation is atomic under a race.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { sellOwnedIncubator } from "./sell-incubator.service.ts";
import { startIncubatingEgg } from "@/features/eggs/services/incubation.service";
import {
  getIncubatorRows,
  getPlayerProfileRow,
  getNotificationsFor,
  resetFakeDb,
  seedIncubator,
  seedOwnedEgg,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1", coins: 0, gold: 0 });
});

test("selling a consumable Regular Incubator returns exactly 50% of its live Shop price (700 -> 350 Coins)", async () => {
  seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: null });

  const result = await sellOwnedIncubator("owner-1", "regular");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.sellPrice, 350);
  assert.equal(result.currency, "money");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 350);
  assert.deepEqual(getIncubatorRows("owner-1"), [], "the sold instance must be gone");

  const notifications = getNotificationsFor("owner-1");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "SHOP_SELL");
});

test("selling a Gold-priced incubator (Ultra: 50 gold -> 25) credits Gold, never Coins", async () => {
  seedIncubator({ playerId: "owner-1", incubatorTypeId: "ultra", permanentSlot: null });

  const result = await sellOwnedIncubator("owner-1", "ultra");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.sellPrice, 25);
  assert.equal(result.currency, "gold");
  const profile = getPlayerProfileRow("owner-1");
  assert.equal(profile?.gold, 25);
  assert.equal(profile?.coins, 0);
});

test("Advanced (1500 -> 750 Coins) and Master (80 -> 40 Gold) sell for exactly 50% of their live Shop price", async () => {
  seedIncubator({ playerId: "owner-1", incubatorTypeId: "advanced", permanentSlot: null });
  seedIncubator({ playerId: "owner-1", incubatorTypeId: "master", permanentSlot: null });

  const advanced = await sellOwnedIncubator("owner-1", "advanced");
  const master = await sellOwnedIncubator("owner-1", "master");

  assert.equal(advanced.status, "success");
  assert.equal(master.status, "success");
  if (advanced.status !== "success" || master.status !== "success") return;
  assert.equal(advanced.sellPrice, 750);
  assert.equal(advanced.currency, "money");
  assert.equal(master.sellPrice, 40);
  assert.equal(master.currency, "gold");
});

test("the permanent starter Regular Incubator is never sellable, even when explicitly targeted", async () => {
  const permanent = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });

  const result = await sellOwnedIncubator("owner-1", "regular");

  assert.equal(result.status, "not-sellable");
  const rows = getIncubatorRows("owner-1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, permanent.id, "the permanent incubator must survive, completely untouched");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 0, "no currency must be granted for a rejected sale");
});

test("selling Regular when the player owns both the permanent starter AND a consumable one only ever removes the consumable", async () => {
  const permanent = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });
  const consumable = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: null });

  const result = await sellOwnedIncubator("owner-1", "regular");

  assert.equal(result.status, "success");
  const rows = getIncubatorRows("owner-1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, permanent.id, "the permanent incubator must remain");
  assert.ok(!rows.some((row) => row.id === consumable.id), "the consumable one must be gone");
});

test("an incubator currently holding an active incubation cannot be sold, and is left completely untouched", async () => {
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "ultra", permanentSlot: null });
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  await startIncubatingEgg("owner-1", incubator.id, egg.id);

  const result = await sellOwnedIncubator("owner-1", "ultra");

  assert.equal(result.status, "not-sellable");
  const rows = getIncubatorRows("owner-1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, incubator.id, "the active incubator must still exist, untouched");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 0);
});

test("with one active and one idle Ultra Incubator owned, selling only ever removes the idle one", async () => {
  const activeIncubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "ultra", permanentSlot: null });
  const idleIncubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "ultra", permanentSlot: null });
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  await startIncubatingEgg("owner-1", activeIncubator.id, egg.id);

  const result = await sellOwnedIncubator("owner-1", "ultra");

  assert.equal(result.status, "success");
  const rows = getIncubatorRows("owner-1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, activeIncubator.id, "the active incubator must survive");
  assert.ok(!rows.some((row) => row.id === idleIncubator.id), "the idle one must be the one sold");
});

test("selling a type the player owns none of is rejected cleanly", async () => {
  const result = await sellOwnedIncubator("owner-1", "master");
  assert.equal(result.status, "not-sellable");
});

test("selling from another player's owned incubators is impossible — only this player's own rows are ever candidates", async () => {
  seedPlayerProfile({ id: "owner-2", coins: 0, gold: 0 });
  const otherPlayersIncubator = seedIncubator({ playerId: "owner-2", incubatorTypeId: "ultra", permanentSlot: null });

  const result = await sellOwnedIncubator("owner-1", "ultra");

  assert.equal(result.status, "not-sellable");
  assert.ok(getIncubatorRows("owner-2").some((row) => row.id === otherPlayersIncubator.id), "the other player's incubator must remain untouched");
});

test("two racing sells against a single sellable instance can't both succeed — exactly one currency credit, never double", async () => {
  seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: null });

  const [first, second] = await Promise.all([sellOwnedIncubator("owner-1", "regular"), sellOwnedIncubator("owner-1", "regular")]);

  const successes = [first, second].filter((result) => result.status === "success");
  assert.equal(successes.length, 1, "exactly one of the two racing sells should have won");
  assert.equal(getPlayerProfileRow("owner-1")?.coins, 350, "currency credit must match exactly one sale, never zero or double");
});
