// EGGS PHASE 6 — cross-feature compatibility coverage: a shop-purchased
// egg and a battle-dropped egg must both flow through the exact same
// PlayerOwnedEgg model with no special conversion, so both immediately
// appear in /hatchery's own available-egg list and both respect the
// "excluded once incubating" rule identically.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { purchaseEggShopItem } from "./egg-shop-purchase.service.ts";
import { rollAndAwardEgg } from "@/features/eggs/services/egg-drop.service";
import { startIncubatingEgg } from "@/features/eggs/services/incubation.service";
import { getHatcheryViewData } from "@/features/hatchery/services/hatchery-view.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1", coins: 10_000, gold: 10_000, regionId: "kanto" });
});

test("a purchased egg immediately appears in the Hatchery's available egg list, alongside a battle-dropped one", async () => {
  const purchased = await purchaseEggShopItem("owner-1", "common-egg", 1);
  assert.equal(purchased.status, "success");

  // A guaranteed battle drop (random() = 0), the exact same integration
  // point EGGS PHASE 2 established — never touched by this phase.
  const dropped = await prisma.$transaction((tx) => rollAndAwardEgg(tx, "owner-1", "johto", () => 0));
  assert.equal(dropped.dropped, true);

  const data = await getHatcheryViewData("owner-1");

  assert.equal(data.availableEggs.length, 2);
  const sources = data.availableEggs.map((egg) => egg.source).sort();
  assert.deepEqual(sources, ["battle", "shop"]);
});

test("once a purchased egg starts incubating, it is excluded from available inventory/Hatchery lists exactly like a battle-dropped one", async () => {
  const purchased = await purchaseEggShopItem("owner-1", "common-egg", 1);
  assert.equal(purchased.status, "success");
  if (purchased.status !== "success") return;

  const before = await getHatcheryViewData("owner-1");
  assert.equal(before.availableEggs.length, 1);

  const started = await startIncubatingEgg("owner-1", before.incubatorId, purchased.eggIds[0]);
  assert.equal(started.status, "started");

  const after = await getHatcheryViewData("owner-1");
  assert.equal(after.availableEggs.length, 0);
  assert.equal(after.activeIncubation?.egg.source, "shop");
});

test("purchasing does not change battle-drop chance/rarity distribution — the two systems remain independent", async () => {
  // A guaranteed-miss battle roll must still report dropped: false
  // regardless of any prior shop purchase in the same test.
  await purchaseEggShopItem("owner-1", "legendary-egg", 1);

  const missed = await prisma.$transaction((tx) => rollAndAwardEgg(tx, "owner-1", "kanto", () => 0.999999));
  assert.deepEqual(missed, { dropped: false });
});
