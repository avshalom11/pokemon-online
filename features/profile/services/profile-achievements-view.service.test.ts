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
import { leagueAwardImageUrl } from "@/features/leagues/data/league-achievement-media";
import { getProfileAchievementsView } from "@/features/profile/services/profile-achievements-view.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID });
});

// LEAGUE AWARDS — same raw prisma.leagueTournament*.create pattern
// features/leagues/services/league-achievement.service.test.ts's own
// createCompletedTournamentWithWinner helper already establishes against
// the fake DB (no dedicated seed helper exists for these models).
async function createCompletedTournamentWithPlacement(leagueId: string, weekKey: string, playerId: string, place: 1 | 2 | 3) {
  const tournament = await prisma.leagueTournament.create({
    data: { leagueId, weekKey, registrationClosesAt: new Date(), round1StartsAt: new Date(), status: "completed" },
  });
  const participant = await prisma.leagueTournamentParticipant.create({
    data: { tournamentId: tournament.id, playerId, participantType: "player" },
  });
  await prisma.leagueTournamentPlacement.create({ data: { tournamentId: tournament.id, place, participantId: participant.id, playerId } });
}

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

test("19: empty achievement state is safe — no badges, no medals, no League awards, no crash", async () => {
  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });
  assert.deepEqual(view, { visibleToViewer: true, hiddenFromOtherUsers: false, badges: [], regionalMedals: [], leagueAwards: [] });
});

// ============================================================================
// LEAGUE AWARDS — per-League Trophies/Medals, reusing getPlayerLeagueAchievements
// / LeagueTournamentPlacement as the sole source of truth (no new table, no
// migration), grouped by (leagueId, place) with a quantity.
// ============================================================================

test("a single League win appears as one award with count 1, the correct Hebrew League name/placement label, and the canonical award image", async () => {
  await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER_ID, 1);

  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });

  assert.equal(view.leagueAwards.length, 1);
  assert.deepEqual(view.leagueAwards[0], {
    leagueId: "league-1",
    place: 1,
    leagueDisplayName: "ליגה I",
    placementLabel: "🥇 מקום ראשון",
    imageUrl: leagueAwardImageUrl("league-1", 1),
    count: 1,
  });
});

test("winning the same League + placement across multiple tournament cycles groups into ONE award with the correct count — never one card per win", async () => {
  await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER_ID, 1);
  await createCompletedTournamentWithPlacement("league-1", "2026-02-05", PLAYER_ID, 1);
  await createCompletedTournamentWithPlacement("league-1", "2026-03-05", PLAYER_ID, 1);

  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });

  assert.equal(view.leagueAwards.length, 1, "three wins of the exact same (leagueId, place) must collapse into one grouped award");
  assert.equal(view.leagueAwards[0]!.count, 3);
});

test("a different placement in the SAME League stays a separate award, never merged with the other placement's count", async () => {
  await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER_ID, 1);
  await createCompletedTournamentWithPlacement("league-1", "2026-02-05", PLAYER_ID, 1);
  await createCompletedTournamentWithPlacement("league-1", "2026-03-05", PLAYER_ID, 1);
  await createCompletedTournamentWithPlacement("league-1", "2026-04-02", PLAYER_ID, 2);
  await createCompletedTournamentWithPlacement("league-1", "2026-05-07", PLAYER_ID, 2);

  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });

  assert.equal(view.leagueAwards.length, 2, "League I 1st place and League I 2nd place must remain two separate awards");
  const first = view.leagueAwards.find((award) => award.place === 1)!;
  const second = view.leagueAwards.find((award) => award.place === 2)!;
  assert.equal(first.count, 3);
  assert.equal(second.count, 2);
});

test("League awards are ordered League I -> Champions League, then 1st -> 3rd place within a League, never by achievement date", async () => {
  await createCompletedTournamentWithPlacement("champions-league", "2026-01-29", PLAYER_ID, 3);
  await createCompletedTournamentWithPlacement("league-2", "2026-01-15", PLAYER_ID, 1);
  await createCompletedTournamentWithPlacement("league-1", "2026-02-05", PLAYER_ID, 2);
  await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER_ID, 1);

  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });

  assert.deepEqual(
    view.leagueAwards.map((award) => `${award.leagueId}-${award.place}`),
    ["league-1-1", "league-1-2", "league-2-1", "champions-league-3"]
  );
});

test("Champions League correctly maps to award image number 4 (gold-4.png for 1st place)", async () => {
  await createCompletedTournamentWithPlacement("champions-league", "2026-01-29", PLAYER_ID, 1);

  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });

  assert.equal(view.leagueAwards[0]!.imageUrl, "/images/leagues/awards/gold-4.png");
});

test("an unearned League award never appears", async () => {
  const view = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: true });
  assert.deepEqual(view.leagueAwards, []);
});

test("League awards respect the SAME visibility setting as Badges/Medals — never a second/separate toggle", async () => {
  await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER_ID, 1);

  const hiddenFromOther = await getProfileAchievementsView(PLAYER_ID, { isOwner: false, showGymAchievementsOnProfile: false });
  assert.equal(hiddenFromOther.visibleToViewer, false);
  assert.deepEqual(hiddenFromOther.leagueAwards, [], "a hidden League award must never be sent to an unauthorized viewer");

  const visibleToOther = await getProfileAchievementsView(PLAYER_ID, { isOwner: false, showGymAchievementsOnProfile: true });
  assert.equal(visibleToOther.leagueAwards.length, 1);

  const ownerAlwaysSees = await getProfileAchievementsView(PLAYER_ID, { isOwner: true, showGymAchievementsOnProfile: false });
  assert.equal(ownerAlwaysSees.leagueAwards.length, 1, "the owner must always see their own League awards regardless of the setting");
});
