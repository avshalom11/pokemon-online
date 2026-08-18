// GYMS & LEAGUES PHASE 4 — focused coverage for the /gyms page's own
// server-side assembler (sections 5/7/16/31/32/33/36 of this Phase's
// spec). Runs the REAL getPlayerGymJourney against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getPlayerGymJourney } from "@/features/gyms/services/gym-overview-view.service";
import { getGymRewardDefinition } from "@/features/gyms/data/gym-reward-registry";
import { grantGymLeaderReward } from "@/features/gyms/services/gym-reward.service";
import { markGymBattleCompleted } from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile, getPlayerProfileRow } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
});

test("the journey always has exactly 9 regions, in progression order", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
  const journey = await getPlayerGymJourney(PLAYER_ID);
  assert.equal(journey.length, 9);
  assert.deepEqual(
    journey.map((r) => r.regionId),
    ["kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar", "paldea"]
  );
});

test("each region shows exactly 3 Gyms + a Regional Champion section", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
  const journey = await getPlayerGymJourney(PLAYER_ID);
  for (const region of journey) {
    assert.equal(region.gyms.length, 3);
    assert.ok(region.regionalChampion);
  }
});

test("future/locked regions are shown, never omitted", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 1, experience: 0 });
  const journey = await getPlayerGymJourney(PLAYER_ID);
  const paldea = journey.find((r) => r.regionId === "paldea")!;
  assert.ok(paldea, "Paldea must still appear even though it's locked at level 1");
  assert.equal(paldea.regionUnlocked, false);
  assert.equal(paldea.lockReason, "locked-level");
});

test("a below-level-10 player sees the locked-level reason on Kanto; a level-10+ player in Johto (no champion yet) sees locked-previous-region", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 5, experience: 0 });
  const lowLevelJourney = await getPlayerGymJourney(PLAYER_ID);
  assert.equal(lowLevelJourney[0].lockReason, "locked-level");

  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
  const journey = await getPlayerGymJourney(PLAYER_ID);
  const johto = journey.find((r) => r.regionId === "johto")!;
  assert.equal(johto.lockReason, "locked-previous-region");
  assert.equal(johto.previousRegionId, "kanto");
});

// REWARD DATA ARCHITECTURE (section 16/36) — the UI's own reward preview
// and the actual grant logic must read the exact same registry entry; this
// proves there is no second, independently-maintained copy of a Gym
// Leader's reward numbers.
test("the region overview's leaderRewardPreview is the SAME registry entry gym-reward.service.ts actually grants from", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
  const journey = await getPlayerGymJourney(PLAYER_ID);
  const kantoGym2 = journey[0].gyms[1];
  const registryEntry = getGymRewardDefinition("kanto", 2);
  assert.deepEqual(kantoGym2.leaderRewardPreview, registryEntry);

  const before = getPlayerProfileRow(PLAYER_ID)!;
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 2, "leader");
    const granted = await grantGymLeaderReward(tx, PLAYER_ID, "kanto", 2);
    assert.equal(granted.money, kantoGym2.leaderRewardPreview.money);
  });
  const after = getPlayerProfileRow(PLAYER_ID)!;
  assert.equal(after.coins, before.coins + kantoGym2.leaderRewardPreview.money);
});
