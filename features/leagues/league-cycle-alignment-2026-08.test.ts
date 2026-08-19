// LEAGUE CYCLE ALIGNMENT — focused, LITERAL-DATE regression coverage for
// the exact real-world alignment this task fixed (the anchor in
// league-cycle.ts moved from 2026-01-08 to 2026-08-06). Distinct from
// league-cycle.test.ts's own generic anchor-relative unit tests (which
// would still pass against ANY correctly-implemented anchor) — this file
// pins down the SPECIFIC calendar dates the ticket requires, so a future
// accidental anchor change is caught by literal, human-readable dates
// rather than only by relative offsets.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getCycleKey, getCycleWeekIndex, getCurrentLeagueCycle, getLeagueForCycleWeek } from "./utils/league-cycle.ts";
import { LEAGUE_SCHEDULE } from "./config/league-schedule.config.ts";
import { getLeaguesOverview } from "./services/league-view.service.ts";
import { resolveChampionsQualifiers } from "./services/champions-league.service.ts";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
});

// 1-4. The 4 exact approved dates.
test("2026-08-06 -> League I, 2026-08-13 -> League II, 2026-08-20 -> League III, 2026-08-27 -> Champions League", () => {
  assert.equal(getLeagueForCycleWeek("2026-08-06"), "league-1");
  assert.equal(getLeagueForCycleWeek("2026-08-13"), "league-2");
  assert.equal(getLeagueForCycleWeek("2026-08-20"), "league-3");
  assert.equal(getLeagueForCycleWeek("2026-08-27"), "champions-league");
});

// All four belong to the SAME cycleKey.
test("2026-08-06 / 08-13 / 08-20 / 08-27 all belong to the SAME cycleKey (2026-08-06)", () => {
  const cycleKey = getCycleKey("2026-08-06");
  assert.equal(cycleKey, "2026-08-06");
  assert.equal(getCycleKey("2026-08-13"), cycleKey);
  assert.equal(getCycleKey("2026-08-20"), cycleKey);
  assert.equal(getCycleKey("2026-08-27"), cycleKey);
});

// 2026-09-03 -> League I of a NEW cycle.
test("2026-09-03 -> League I, belonging to a NEW, distinct cycleKey", () => {
  assert.equal(getLeagueForCycleWeek("2026-09-03"), "league-1");
  assert.equal(getCycleWeekIndex("2026-09-03"), 0);
  const newCycleKey = getCycleKey("2026-09-03");
  assert.equal(newCycleKey, "2026-09-03");
  assert.notEqual(newCycleKey, getCycleKey("2026-08-06"), "2026-09-03 must start its own cycle, never be folded into the Aug cycle");
});

// Champions 2026-08-27 resolves qualifiers from the Aug 6 / Aug 13 / Aug 20
// tournaments of the SAME cycle — and no cross-cycle leakage: a League I
// win registered under the NEXT cycle's own League I week (2026-09-03)
// must never be pulled into the Aug 27 Champions League qualifiers.
test("Champions League 2026-08-27 resolves its 4 qualifiers from exactly the Aug 6 / Aug 13 / Aug 20 tournaments of the same cycle — no cross-cycle leakage", async () => {
  const augCycleKey = getCycleKey("2026-08-06");

  async function completeRegionalTournament(leagueId: string, weekKey: string, winnerPlayerId: string, runnerUpPlayerId?: string) {
    const tournament = await prisma.leagueTournament.create({
      data: { leagueId, weekKey, registrationClosesAt: new Date(), round1StartsAt: new Date(), status: "completed" },
    });
    const winner = await prisma.leagueTournamentParticipant.create({ data: { tournamentId: tournament.id, playerId: winnerPlayerId, participantType: "player" } });
    await prisma.leagueTournamentPlacement.create({ data: { tournamentId: tournament.id, place: 1, participantId: winner.id, playerId: winnerPlayerId } });
    if (runnerUpPlayerId) {
      const runnerUp = await prisma.leagueTournamentParticipant.create({ data: { tournamentId: tournament.id, playerId: runnerUpPlayerId, participantType: "player" } });
      await prisma.leagueTournamentPlacement.create({ data: { tournamentId: tournament.id, place: 2, participantId: runnerUp.id, playerId: runnerUpPlayerId } });
    }
  }

  // The real, correct-cycle tournaments (Aug 6 / Aug 13 / Aug 20).
  await completeRegionalTournament("league-1", "2026-08-06", "aug-champ-1");
  await completeRegionalTournament("league-2", "2026-08-13", "aug-champ-2");
  await completeRegionalTournament("league-3", "2026-08-20", "aug-champ-3", "aug-runner-up-3");

  // A DIFFERENT cycle's own League I tournament (2026-09-03) — must never
  // leak into the Aug cycle's qualifiers, even though it's the same
  // leagueId ("league-1").
  await completeRegionalTournament("league-1", "2026-09-03", "sept-champ-1");

  const result = await resolveChampionsQualifiers(augCycleKey);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;

  assert.deepEqual(
    result.qualifiers.map((q) => q.playerId),
    ["aug-champ-1", "aug-champ-2", "aug-champ-3", "aug-runner-up-3"],
    "qualifiers must come exclusively from the Aug 6/13/20 tournaments — the Sept 3 League I winner must never appear"
  );
  assert.ok(!result.qualifiers.some((q) => q.playerId === "sept-champ-1"), "no cross-cycle qualifier leakage from the next cycle's League I");
});

// Existing registration/tournament times unchanged — this task adjusted
// only the WEEK->League mapping, never the daily schedule config.
test("existing registration/tournament times are unchanged by this task", () => {
  assert.deepEqual(LEAGUE_SCHEDULE, {
    timezone: "Asia/Jerusalem",
    registrationClosesDayOfWeek: "thursday",
    registrationClosesTime: "18:30",
    round1StartsDayOfWeek: "thursday",
    round1StartsTime: "19:00",
    minutesBetweenRounds: 30,
    battleRoomActiveWindowMinutes: 20,
  });
});

// /leagues reports League III as active for the week containing 2026-08-19
// (a Wednesday whose upcoming Thursday is 2026-08-20); the following week
// reports Champions League; the week after that starts a NEW cycle with
// League I.
test("/leagues reports League III for the week containing 2026-08-19, Champions League the following week, and a new cycle's League I the week after that", async () => {
  const containingAug19 = await getLeaguesOverview(PLAYER_ID, new Date("2026-08-19T08:00:00Z"));
  assert.equal(containingAug19.cycle.activeLeagueId, "league-3");
  assert.equal(containingAug19.cycle.weekIndexInCycle, 2);

  const nextWeek = await getLeaguesOverview(PLAYER_ID, new Date("2026-08-21T08:00:00Z")); // Friday, after Aug 20 passed
  assert.equal(nextWeek.cycle.activeLeagueId, "champions-league");
  assert.equal(nextWeek.cycle.weekIndexInCycle, 3);

  const weekAfter = await getLeaguesOverview(PLAYER_ID, new Date("2026-08-28T08:00:00Z")); // Friday, after Aug 27 passed
  assert.equal(weekAfter.cycle.activeLeagueId, "league-1");
  assert.equal(weekAfter.cycle.weekIndexInCycle, 0);
});

test("a fresh cycle begins only after Champions League completes — getCurrentLeagueCycle for 2026-08-28 reports a DIFFERENT cycleKey than 2026-08-19's own cycle", () => {
  const augCycle = getCurrentLeagueCycle(new Date("2026-08-19T08:00:00Z"));
  const septCycle = getCurrentLeagueCycle(new Date("2026-08-28T08:00:00Z"));
  assert.equal(augCycle.cycleKey, "2026-08-06");
  assert.equal(septCycle.cycleKey, "2026-09-03");
  assert.notEqual(augCycle.cycleKey, septCycle.cycleKey);
});
