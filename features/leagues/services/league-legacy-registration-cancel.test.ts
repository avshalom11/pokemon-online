// LEAGUE LEGACY REGISTRATION — CANCEL BUTTON FIX — focused regression for
// the exact reported edge case.
//
// REALISTIC RECONSTRUCTION: the reported scenario ("avshalom registered
// for League I before we added the active-week-only registration rule;
// now the current week is League III") is exactly what a leftover row from
// BEFORE the "LEAGUE CYCLE ALIGNMENT" anchor fix (a separate, earlier
// task) looks like today. Under the OLD anchor (2026-01-08), the calendar
// week of 2026-08-20 resolved to League I; under the CORRECTED anchor
// (2026-08-06, current), that exact same week correctly resolves to League
// III. A LeagueTournament{leagueId:"league-1", weekKey:"2026-08-20"} row
// created back then is therefore a real, structurally-valid row (its own
// registrationClosesAt/round1StartsAt are perfectly normal, not-yet-passed
// times for THIS week) that the RUN of the current, corrected rotation
// logic now considers "not this week's active League" — precisely the
// mismatch getCurrentTournamentForLeague's week-scoped lookup could never
// see once "this week" stopped being League I's own week, which is what
// made `registered`/the cancel button silently disappear. Seeded directly
// via prisma (bypassing registerForLeague, which would correctly REFUSE to
// create such a mismatched row today) — the same "construct the exact
// legacy DB state" technique this project's own tests already use
// elsewhere for pre-existing data.
import assert from "node:assert/strict";
import { test } from "node:test";

import { cancelLeagueRegistration, registerForLeague } from "./league-tournament.service.ts";
import { getLeaguesOverview } from "./league-view.service.ts";
import { getOccurrenceWindowForWeekKey } from "../utils/jerusalem-schedule.ts";
import { markGymBattleCompleted, markRegionalChampionDefeated } from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile, getLeagueTournamentParticipantRows } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "avshalom";
const LEGACY_WEEK_KEY = "2026-08-20"; // this week's own Thursday — currently League III's week
// Wednesday, still before this week's own Thursday 18:30 deadline.
const NOW_BEFORE_DEADLINE = new Date("2026-08-19T08:00:00Z");

async function makeEligiblePlayer(playerId: string, regionIds: readonly string[] = ["kanto", "johto", "hoenn"]) {
  seedPlayerProfile({ id: playerId, level: 50, experience: 0 });
  await prisma.$transaction(async (tx) => {
    for (const regionId of regionIds) {
      await markGymBattleCompleted(tx, playerId, regionId as never, 1, "leader");
      await markGymBattleCompleted(tx, playerId, regionId as never, 2, "leader");
      await markGymBattleCompleted(tx, playerId, regionId as never, 3, "leader");
      await markRegionalChampionDefeated(tx, playerId, regionId as never);
    }
  });
}

async function seedLegacyLeagueOneRegistration(playerId: string) {
  const window = getOccurrenceWindowForWeekKey(LEGACY_WEEK_KEY);
  const tournament = await prisma.leagueTournament.create({
    data: { leagueId: "league-1", weekKey: LEGACY_WEEK_KEY, registrationClosesAt: window.registrationClosesAt, round1StartsAt: window.round1StartsAt, status: "registration-open" },
  });
  await prisma.leagueTournamentParticipant.create({ data: { tournamentId: tournament.id, playerId, participantType: "player" } });
  return tournament;
}

test("legacy registration: a pre-existing League I registration (mismatched week under the corrected rotation) still shows registered + cancellable this week, and cancelling it works", async () => {
  resetFakeDb();
  await makeEligiblePlayer(PLAYER_ID, ["kanto", "johto", "hoenn"]);
  const legacyTournament = await seedLegacyLeagueOneRegistration(PLAYER_ID);

  // 2. Current active League = League III.
  const overview = await getLeaguesOverview(PLAYER_ID, NOW_BEFORE_DEADLINE);
  assert.equal(overview.cycle.activeLeagueId, "league-3");
  const league1View = overview.regionalLeagues.find((l) => l.leagueId === "league-1")!;
  assert.equal(league1View.activeThisWeek, false, "League I must not be this week's active League");

  // 3. League I cannot accept a NEW registration this week.
  const secondPlayer = "someone-else";
  await makeEligiblePlayer(secondPlayer, ["kanto", "johto", "hoenn"]);
  const newRegistrationAttempt = await registerForLeague(secondPlayer, "league-1", NOW_BEFORE_DEADLINE);
  assert.deepEqual(newRegistrationAttempt, { status: "league-not-active-this-week" });
  assert.equal(league1View.registrationOpen, false, "the view model must also report NEW registration as closed for League I this week");

  // 4. The pre-existing League I registration still shows as registered
  // AND exposes cancel, even though League I is inactive this week — this
  // is the exact bug being fixed (previously `registered` incorrectly
  // reported false here, hiding the cancel button entirely).
  assert.equal(league1View.registered, true);
  assert.equal(league1View.canCancelRegistration, true, "cancellation must be exposed — its own deadline (this week's Thursday) has not passed");

  // 5. Cancelling removes that registration.
  const cancelResult = await cancelLeagueRegistration(PLAYER_ID, "league-1", NOW_BEFORE_DEADLINE);
  assert.deepEqual(cancelResult, { status: "cancelled" });

  const participants = getLeagueTournamentParticipantRows(legacyTournament.id);
  assert.ok(!participants.some((p) => p.playerId === PLAYER_ID), "the participant row must actually be removed");

  const overviewAfterCancel = await getLeaguesOverview(PLAYER_ID, NOW_BEFORE_DEADLINE);
  const league1ViewAfterCancel = overviewAfterCancel.regionalLeagues.find((l) => l.leagueId === "league-1")!;
  assert.equal(league1ViewAfterCancel.registered, false);
  assert.equal(league1ViewAfterCancel.canCancelRegistration, false);
});

// Existing restrictions still apply to a legacy registration, once its own
// deadline genuinely has passed.
test("existing restrictions still apply to a legacy registration: after ITS OWN registration deadline passes, cancellation is rejected", async () => {
  resetFakeDb();
  await makeEligiblePlayer(PLAYER_ID);
  await seedLegacyLeagueOneRegistration(PLAYER_ID);

  const window = getOccurrenceWindowForWeekKey(LEGACY_WEEK_KEY);
  const afterDeadline = new Date(window.registrationClosesAt.getTime() + 60_000);

  const result = await cancelLeagueRegistration(PLAYER_ID, "league-1", afterDeadline);
  assert.deepEqual(result, { status: "registration-closed" });
});

test("existing restrictions still apply to a legacy registration: once Round 1 has been generated for it, cancellation is rejected", async () => {
  resetFakeDb();
  await makeEligiblePlayer(PLAYER_ID);
  await makeEligiblePlayer("second", ["kanto", "johto", "hoenn"]);
  const tournament = await seedLegacyLeagueOneRegistration(PLAYER_ID);
  await prisma.leagueTournamentParticipant.create({ data: { tournamentId: tournament.id, playerId: "second", participantType: "player" } });

  const { generateRound1ForTournament } = await import("./league-tournament.service.ts");
  const generated = await generateRound1ForTournament(tournament.id, () => 0.5);
  assert.equal(generated.status, "generated");

  const result = await cancelLeagueRegistration(PLAYER_ID, "league-1", NOW_BEFORE_DEADLINE);
  assert.deepEqual(result, { status: "round1-already-generated" });
});

test("Champions League still has no manual cancel, regardless of any registration state", async () => {
  resetFakeDb();
  const result = await cancelLeagueRegistration(PLAYER_ID, "champions-league", NOW_BEFORE_DEADLINE);
  assert.deepEqual(result, { status: "champions-league-not-cancellable" });
});
