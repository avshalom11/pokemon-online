// Focused regression coverage for EGGS PHASE 1's ownership persistence
// primitives — runs the real createOwnedEgg/listOwnedEggs unmodified
// against the in-memory fake DB (test/support/fakes/prisma.fake.ts), same
// "real service, fake DB" shape daily-battle-count.integration.test.ts
// already established.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { createOwnedEgg, listOwnedEggs } from "./egg-ownership.service.ts";
import {
  getEggIncubationRow,
  getOwnedEggRow,
  resetFakeDb,
  seedIncubator,
  seedOwnedEgg,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

test("createOwnedEgg preserves the egg's own region and rarity", async () => {
  const egg = await createOwnedEgg(prisma, "owner-1", "rare", "johto", "battle");
  assert.equal(egg.regionId, "johto");
  assert.equal(egg.rarity, "rare");
  assert.equal(egg.source, "battle");
  assert.equal(egg.playerId, "owner-1");

  const stored = getOwnedEggRow(egg.id);
  assert.ok(stored, "the egg must actually be persisted");
  assert.equal(stored?.regionId, "johto");
});

test("source is optional and defaults to null (neither acquisition path is implemented yet)", async () => {
  const egg = await createOwnedEgg(prisma, "owner-1", "common", "kanto");
  assert.equal(egg.source, null);
});

test("multiple eggs of the same rarity AND region coexist as independent rows, never merged into a quantity counter", async () => {
  const first = await createOwnedEgg(prisma, "owner-1", "common", "kanto", "battle");
  const second = await createOwnedEgg(prisma, "owner-1", "common", "kanto", "battle");

  assert.notEqual(first.id, second.id, "each egg must keep its own independent identity");

  const owned = await listOwnedEggs("owner-1");
  assert.equal(owned.length, 2);
});

test("eggs of the same rarity but different regions/sources all coexist independently", async () => {
  await createOwnedEgg(prisma, "owner-1", "rare", "kanto", "battle");
  await createOwnedEgg(prisma, "owner-1", "rare", "johto", "shop");
  await createOwnedEgg(prisma, "owner-1", "rare", "kanto", "shop");

  const owned = await listOwnedEggs("owner-1");
  assert.equal(owned.length, 3);
  assert.deepEqual(
    owned.map((egg) => `${egg.regionId}:${egg.source}`).sort(),
    ["johto:shop", "kanto:battle", "kanto:shop"]
  );
});

test("listOwnedEggs only returns this player's own eggs", async () => {
  seedPlayerProfile({ id: "owner-2" });
  await createOwnedEgg(prisma, "owner-1", "common", "kanto");
  await createOwnedEgg(prisma, "owner-2", "common", "kanto");

  const owned = await listOwnedEggs("owner-1");
  assert.equal(owned.length, 1);
  assert.equal(owned[0].playerId, "owner-1");
});

test("an egg with an active incubation is excluded from listOwnedEggs — no longer available as an unassigned egg", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });
  await prisma.playerEggIncubation.create({
    data: { ownedEggId: egg.id, incubatorId: incubator.id, requiredBattleTarget: 400 },
  });

  const owned = await listOwnedEggs("owner-1");
  assert.deepEqual(owned, []);
  assert.ok(getEggIncubationRow(egg.id), "the incubation row itself must still exist");
});
