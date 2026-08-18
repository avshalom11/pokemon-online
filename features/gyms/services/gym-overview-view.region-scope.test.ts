// GYMS — REGION-SCOPED UI — focused coverage for getPlayerCurrentRegionGymOverview
// (section 7, items 1-5). Runs the REAL function against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getPlayerCurrentRegionGymOverview } from "@/features/gyms/services/gym-overview-view.service";
import { markRegionalChampionDefeated } from "@/features/gyms/services/gym-progression.service";
import { REGION_GYM_SEQUENCE } from "@/features/gyms/data/region-gym-sequence";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
});

test("a Kanto player sees only Kanto's own 3 Gyms + Champion, never the other 8 regions", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, regionId: "kanto", experience: 0 });
  const region = await getPlayerCurrentRegionGymOverview(PLAYER_ID);

  assert.equal(region.regionId, "kanto");
  assert.equal(region.gyms.length, 3);
  assert.ok(region.regionalChampion);
  // Never an array of 9 — a single region's own overview object.
  assert.equal(Array.isArray(region), false);
});

test("a Johto player sees only Johto's own Gym data", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, regionId: "johto", experience: 0 });
  const region = await getPlayerCurrentRegionGymOverview(PLAYER_ID);

  assert.equal(region.regionId, "johto");
  assert.equal(region.englishName, "Johto");
});

test("all 9 regions map correctly to their own PlayerProfile.regionId", async () => {
  for (const regionId of REGION_GYM_SEQUENCE) {
    seedPlayerProfile({ id: PLAYER_ID, level: 50, regionId, experience: 0 });
    const region = await getPlayerCurrentRegionGymOverview(PLAYER_ID);
    assert.equal(region.regionId, regionId);
  }
});

test("sequential region lock is still enforced — Johto shown but locked when Kanto's Champion isn't defeated", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, regionId: "johto", experience: 0 });
  const region = await getPlayerCurrentRegionGymOverview(PLAYER_ID);

  assert.equal(region.regionId, "johto", "still the player's own current region — never silently substituted");
  assert.equal(region.lockReason, "locked-previous-region");
  assert.equal(region.regionUnlocked, false);
  assert.ok(region.gyms.every((gym) => !gym.unlocked), "every Gym in the shown-but-locked region stays locked");
});

test("once Kanto's Champion is defeated, a Johto player's own region unlocks normally", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, regionId: "johto", experience: 0 });
  await prisma.$transaction(async (tx) => {
    await markRegionalChampionDefeated(tx, PLAYER_ID, "kanto");
  });

  const region = await getPlayerCurrentRegionGymOverview(PLAYER_ID);
  assert.equal(region.regionId, "johto");
  assert.equal(region.lockReason, null);
  assert.equal(region.regionUnlocked, true);
});

test("a below-level-10 player's own current region is shown locked-level, not omitted", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 1, regionId: "kanto", experience: 0 });
  const region = await getPlayerCurrentRegionGymOverview(PLAYER_ID);
  assert.equal(region.regionId, "kanto");
  assert.equal(region.lockReason, "locked-level");
});

test("an unrecognized/legacy regionId value falls back to kanto rather than crashing", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, regionId: "not-a-real-region", experience: 0 });
  const region = await getPlayerCurrentRegionGymOverview(PLAYER_ID);
  assert.equal(region.regionId, "kanto");
});
