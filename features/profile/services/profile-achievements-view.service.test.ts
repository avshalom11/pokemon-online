// PROFILE ACHIEVEMENTS — focused coverage for getProfileAchievementsView,
// the "הישגים" section's own data assembly. Runs the REAL function
// unmodified against the in-memory fake DB (test/support/fakes/
// prisma.fake.ts), same precedent as gym-progression.service.test.ts —
// this file intentionally never touches the (currently unconnected —
// see this task's own research notes) getPlayerProfile/getPublicProfileView
// User-join path; getProfileAchievementsView takes isOwner/
// showGymAchievementsOnProfile as already-resolved parameters specifically
// so its own privacy-gating logic is testable in isolation.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getGymBadgeDefinition } from "@/features/gyms/data/gym-badges";
import { getRegionalMedalDefinition } from "@/features/gyms/data/regional-medals";
import { markGymBattleCompleted, markRegionalChampionDefeated } from "@/features/gyms/services/gym-progression.service";
import { getProfileAchievementsView } from "@/features/profile/services/profile-achievements-view.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID });
});

test("1/7: an earned Badge appears, using the existing Badge catalog's own displayName/imageUrl (getGymBadgeDefinition)", async () => {
  await markGymBattleCompleted(prisma, PLAYER_ID, "kanto", 1, "leader");

  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });

  const expected = getGymBadgeDefinition("kanto", 1);
  assert.equal(view.badges.length, 1);
  assert.deepEqual(view.badges[0], { regionId: "kanto", gymNumber: 1, displayName: expected.displayName, imageUrl: expected.imageUrl });
});

test("2/8: an earned Medal appears, using the existing Medal catalog's own displayName/imageUrl (getRegionalMedalDefinition)", async () => {
  await markRegionalChampionDefeated(prisma, PLAYER_ID, "kanto");

  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });

  const expected = getRegionalMedalDefinition("kanto");
  assert.equal(view.regionalMedals.length, 1);
  assert.deepEqual(view.regionalMedals[0], { regionId: "kanto", displayName: expected.displayName, imageUrl: expected.imageUrl });
});

test("3: an unearned Badge never appears", async () => {
  await markGymBattleCompleted(prisma, PLAYER_ID, "kanto", 1, "leader");
  // Easy/Medium wins never award a badge at all — confirms this view never
  // invents one either.
  await markGymBattleCompleted(prisma, PLAYER_ID, "kanto", 2, "easy");

  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });

  assert.equal(view.badges.length, 1);
  assert.ok(!view.badges.some((badge) => badge.regionId === "kanto" && badge.gymNumber === 2));
});

test("4: an unearned Medal never appears", async () => {
  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });
  assert.deepEqual(view.regionalMedals, []);
});

test("5: Badge ordering follows region/Gym progression order, never alphabetical", async () => {
  // Earned out of order on purpose — the VIEW's own ordering must not
  // depend on insertion order.
  await markGymBattleCompleted(prisma, PLAYER_ID, "paldea", 3, "leader");
  await markGymBattleCompleted(prisma, PLAYER_ID, "kanto", 2, "leader");
  await markGymBattleCompleted(prisma, PLAYER_ID, "kanto", 1, "leader");
  await markGymBattleCompleted(prisma, PLAYER_ID, "johto", 1, "leader");

  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });

  assert.deepEqual(
    view.badges.map((badge) => `${badge.regionId}-${badge.gymNumber}`),
    ["kanto-1", "kanto-2", "johto-1", "paldea-3"]
  );
});

test("6: Regional Medal ordering follows region progression order, never alphabetical", async () => {
  await markRegionalChampionDefeated(prisma, PLAYER_ID, "paldea");
  await markRegionalChampionDefeated(prisma, PLAYER_ID, "hoenn");
  await markRegionalChampionDefeated(prisma, PLAYER_ID, "kanto");

  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });

  assert.deepEqual(
    view.regionalMedals.map((medal) => medal.regionId),
    ["kanto", "hoenn", "paldea"]
  );
});

test("11: other viewer sees achievements when visibility is ON", async () => {
  await markGymBattleCompleted(prisma, PLAYER_ID, "kanto", 1, "leader");

  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: false, showGymAchievementsOnProfile: true });

  assert.equal(view.visibleToViewer, true);
  assert.equal(view.badges.length, 1);
});

test("11: other viewer does NOT receive achievement data when visibility is OFF — genuinely empty arrays, not just hidden by the UI", async () => {
  await markGymBattleCompleted(prisma, PLAYER_ID, "kanto", 1, "leader");
  await markRegionalChampionDefeated(prisma, PLAYER_ID, "kanto");

  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: false, showGymAchievementsOnProfile: false });

  assert.equal(view.visibleToViewer, false);
  assert.deepEqual(view.badges, [], "the real earned badge must never be sent to an unauthorized viewer");
  assert.deepEqual(view.regionalMedals, []);
});

test("12: the owner still sees their own real achievements even when visibility is OFF", async () => {
  await markGymBattleCompleted(prisma, PLAYER_ID, "kanto", 1, "leader");

  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: false });

  assert.equal(view.visibleToViewer, true, "the owner must always see their own achievements, regardless of the setting");
  assert.equal(view.badges.length, 1);
  assert.equal(view.hiddenFromOtherUsers, true, "the owner's view must also know the setting is currently OFF, to show the 'hidden from others' note");
});

test("16: hiding achievements never deletes the underlying Badge/Medal rows — turning visibility back ON immediately shows the same real data", async () => {
  await markGymBattleCompleted(prisma, PLAYER_ID, "kanto", 1, "leader");

  const hidden = await getProfileAchievementsView(PLAYER_ID, { isOwner: false, showGymAchievementsOnProfile: false });
  assert.deepEqual(hidden.badges, []);

  const visibleAgain = await getProfileAchievementsView(PLAYER_ID, { isOwner: false, showGymAchievementsOnProfile: true });
  assert.equal(visibleAgain.badges.length, 1, "the real badge row was never touched by hiding it — only display privacy changed");
});

test("19: empty achievement state is safe — no badges, no medals, no crash", async () => {
  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });
  assert.deepEqual(view, { visibleToViewer: true, hiddenFromOtherUsers: false, badges: [], regionalMedals: [] });
});
