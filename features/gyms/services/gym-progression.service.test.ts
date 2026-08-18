// Focused DB-backed coverage for the one thing gym-progression-rules.test.ts
// (pure, no DB) can't verify on its own: that the mutation primitives are
// genuinely idempotent against the real (fake) database, and that the read
// functions correctly reflect what markGymBattleCompleted/
// markRegionalChampionDefeated actually persisted — including the
// "leader win awards the badge" / "champion win awards the medal" atomic
// linkage. Runs the REAL gym-progression.service.ts unmodified against the
// in-memory fake DB (test/support/fakes/prisma.fake.ts), same precedent as
// daily-battle-count.integration.test.ts.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  getOwnedGymBadges,
  getOwnedRegionalMedals,
  getRegionGymProgress,
  hasBadge,
  hasRegionalMedal,
  isGymBattleCompleted,
  isRegionalChampionDefeated,
  markGymBattleCompleted,
  markRegionalChampionDefeated,
} from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedPlayerProfile,
  getGymBattleProgressRow,
  getGymBadgeRow,
  getRegionalChampionProgressRow,
  getRegionalMedalRow,
} from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
const REGION_ID = "kanto";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID });
});

test("markGymBattleCompleted is idempotent: calling it twice never duplicates progression", async () => {
  await markGymBattleCompleted(prisma, PLAYER_ID, REGION_ID, 1, "easy");
  await markGymBattleCompleted(prisma, PLAYER_ID, REGION_ID, 1, "easy");

  assert.ok(getGymBattleProgressRow(PLAYER_ID, REGION_ID, 1, "easy"));
  assert.equal(await isGymBattleCompleted(PLAYER_ID, REGION_ID, 1, "easy"), true);
});

test("winning the Gym Leader battle awards the matching Gym Badge in the same call, exactly once even if called twice", async () => {
  await markGymBattleCompleted(prisma, PLAYER_ID, REGION_ID, 1, "leader");
  await markGymBattleCompleted(prisma, PLAYER_ID, REGION_ID, 1, "leader");

  assert.ok(getGymBattleProgressRow(PLAYER_ID, REGION_ID, 1, "leader"));
  assert.ok(getGymBadgeRow(PLAYER_ID, REGION_ID, 1));
  assert.equal(await hasBadge(PLAYER_ID, REGION_ID, 1), true);
});

test("Easy/Medium wins never award a badge", async () => {
  await markGymBattleCompleted(prisma, PLAYER_ID, REGION_ID, 1, "easy");
  await markGymBattleCompleted(prisma, PLAYER_ID, REGION_ID, 1, "medium");

  assert.equal(getGymBadgeRow(PLAYER_ID, REGION_ID, 1), undefined);
  assert.equal(await hasBadge(PLAYER_ID, REGION_ID, 1), false);
});

test("markRegionalChampionDefeated is idempotent and awards the Regional Medal in the same call", async () => {
  await markRegionalChampionDefeated(prisma, PLAYER_ID, REGION_ID);
  await markRegionalChampionDefeated(prisma, PLAYER_ID, REGION_ID);

  assert.ok(getRegionalChampionProgressRow(PLAYER_ID, REGION_ID));
  assert.ok(getRegionalMedalRow(PLAYER_ID, REGION_ID));
  assert.equal(await isRegionalChampionDefeated(PLAYER_ID, REGION_ID), true);
  assert.equal(await hasRegionalMedal(PLAYER_ID, REGION_ID), true);
});

test("getRegionGymProgress reflects real persisted progress end to end", async () => {
  await markGymBattleCompleted(prisma, PLAYER_ID, REGION_ID, 1, "easy");
  await markGymBattleCompleted(prisma, PLAYER_ID, REGION_ID, 1, "medium");
  await markGymBattleCompleted(prisma, PLAYER_ID, REGION_ID, 1, "leader");

  const progress = await getRegionGymProgress(PLAYER_ID, REGION_ID);

  assert.equal(progress.gyms[0].badgeEarned, true);
  assert.equal(progress.gyms[0].battles.every((b) => b.completed), true);
  assert.equal(progress.gyms[1].unlocked, true, "Gym 2 unlocked now that Gym 1 is fully complete");
  assert.equal(progress.gyms[2].unlocked, false, "Gym 3 still locked");
  assert.equal(progress.regionalChampionUnlocked, false, "only 1 of 3 badges earned so far");
  assert.equal(progress.regionalChampionDefeated, false);
  assert.equal(progress.regionalMedalEarned, false);
});

// PROFILE ACHIEVEMENTS (later task) — getOwnedGymBadges/
// getOwnedRegionalMedals are the profile feature's own read path into
// this SAME PlayerGymBadge/PlayerRegionalMedal persistence — no separate
// profile-achievement table, nothing inferred from client state.
test("getOwnedGymBadges lists every badge actually earned, across regions, and none that weren't", async () => {
  await markGymBattleCompleted(prisma, PLAYER_ID, "kanto", 1, "leader");
  await markGymBattleCompleted(prisma, PLAYER_ID, "johto", 2, "leader");
  // Easy/Medium wins never award a badge — must not leak into this list.
  await markGymBattleCompleted(prisma, PLAYER_ID, "kanto", 2, "easy");

  const owned = await getOwnedGymBadges(PLAYER_ID);

  assert.equal(owned.length, 2);
  assert.ok(owned.some((badge) => badge.regionId === "kanto" && badge.gymNumber === 1));
  assert.ok(owned.some((badge) => badge.regionId === "johto" && badge.gymNumber === 2));
});

test("getOwnedGymBadges returns an empty array for a player with no badges yet", async () => {
  assert.deepEqual(await getOwnedGymBadges(PLAYER_ID), []);
});

test("getOwnedGymBadges never returns another player's badges", async () => {
  seedPlayerProfile({ id: "other-player" });
  await markGymBattleCompleted(prisma, "other-player", "kanto", 1, "leader");

  assert.deepEqual(await getOwnedGymBadges(PLAYER_ID), []);
});

test("getOwnedRegionalMedals lists every medal actually earned, and none that weren't", async () => {
  await markRegionalChampionDefeated(prisma, PLAYER_ID, "kanto");

  const owned = await getOwnedRegionalMedals(PLAYER_ID);

  assert.deepEqual(owned, ["kanto"]);
});

test("getOwnedRegionalMedals returns an empty array for a player with no medals yet", async () => {
  assert.deepEqual(await getOwnedRegionalMedals(PLAYER_ID), []);
});
