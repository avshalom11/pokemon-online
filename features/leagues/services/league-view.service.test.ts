// GYMS & LEAGUES PHASE 5 — focused coverage for the /leagues page's own
// server-side assembler (UI/DATA items 27-29). Runs the REAL
// getLeaguesOverview against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getLeaguesOverview } from "./league-view.service.ts";
import { resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
// LEAGUE CYCLE ALIGNMENT FIX (later task) — League I's own week under the
// current cycle anchor (league-cycle.ts's CYCLE_ANCHOR_WEEK_KEY = "2026-08-06").
const NOW = new Date("2026-08-03T08:00:00Z"); // Monday — registration open

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
});

test("the League page exposes all 4 Leagues (3 regional + Champions League)", async () => {
  const overview = await getLeaguesOverview(PLAYER_ID, NOW);
  assert.equal(overview.regionalLeagues.length, 3);
  assert.deepEqual(
    overview.regionalLeagues.map((l) => l.leagueId),
    ["league-1", "league-2", "league-3"]
  );
  assert.equal(overview.championsLeague.leagueId, "champions-league");
});

test("League I-III each expose eligibility, registration-open, and registered status", async () => {
  const overview = await getLeaguesOverview(PLAYER_ID, NOW);
  for (const league of overview.regionalLeagues) {
    assert.equal(typeof league.eligible, "boolean");
    assert.equal(typeof league.registrationOpen, "boolean");
    assert.equal(typeof league.registered, "boolean");
    assert.ok(league.registrationClosesAt instanceof Date);
  }
});

// GYMS & LEAGUES PHASE 8 — the Champions League view grew qualification/
// tournament/champion status fields (section 28), but must still carry NO
// registration-related field of any kind — no register button is ever
// possible for it.
test("Champions League view carries no registration-related fields (no register button is possible)", async () => {
  const overview = await getLeaguesOverview(PLAYER_ID, NOW);
  const keys = Object.keys(overview.championsLeague);
  for (const forbidden of ["registrationOpen", "registered", "eligible", "registrationClosesAt"]) {
    assert.ok(!keys.includes(forbidden), `Champions League view must never expose ${forbidden}`);
  }
  assert.equal(typeof overview.championsLeague.qualifiersReady, "boolean");
  assert.equal(typeof overview.championsLeague.tournamentCreated, "boolean");
});

// GYMS & LEAGUES PHASE 8 — section 28's own "active this week / not active
// this week" minimum backend state.
test("only League I reports activeThisWeek during League I's own week", async () => {
  const overview = await getLeaguesOverview(PLAYER_ID, NOW);
  const byId = new Map(overview.regionalLeagues.map((l) => [l.leagueId, l]));
  assert.equal(byId.get("league-1")!.activeThisWeek, true);
  assert.equal(byId.get("league-2")!.activeThisWeek, false);
  assert.equal(byId.get("league-3")!.activeThisWeek, false);
  assert.equal(overview.championsLeague.activeThisWeek, false);
});

test("during Champions League week, no regional League reports activeThisWeek, and Champions League itself does", async () => {
  const championsWeekNow = new Date("2026-08-24T08:00:00Z"); // resolves to Champions League week
  const overview = await getLeaguesOverview(PLAYER_ID, championsWeekNow);
  for (const league of overview.regionalLeagues) {
    assert.equal(league.activeThisWeek, false, `${league.leagueId} must not be active during Champions week`);
    assert.equal(league.registrationOpen, false);
  }
  assert.equal(overview.championsLeague.activeThisWeek, true);
});

// GYMS & LEAGUES PHASE 9 (section 12) — the 4-week cycle position exposed
// for the UI, read straight off Phase 8's own league-cycle.ts helpers.
test("cycle.weekIndexInCycle/activeLeagueId track the same 4-week rotation isLeagueActiveThisWeek already uses", async () => {
  const league1Week = await getLeaguesOverview(PLAYER_ID, NOW);
  assert.deepEqual(league1Week.cycle, { activeLeagueId: "league-1", weekIndexInCycle: 0 });

  const championsWeekNow = new Date("2026-08-24T08:00:00Z");
  const championsWeek = await getLeaguesOverview(PLAYER_ID, championsWeekNow);
  assert.deepEqual(championsWeek.cycle, { activeLeagueId: "champions-league", weekIndexInCycle: 3 });
});

// GYMS & LEAGUES PHASE 9 (section 14) — hasDuplicateQualifier surfaces
// champions-league.service.ts's own documented "duplicate-qualifier" state
// to the UI, without ever exposing which player it was.
test("hasDuplicateQualifier is false when qualifiers aren't ready yet (no regional League has completed this cycle)", async () => {
  const overview = await getLeaguesOverview(PLAYER_ID, NOW);
  assert.equal(overview.championsLeague.hasDuplicateQualifier, false);
  assert.equal(overview.championsLeague.qualifiersReady, false);
});

// PLAYER LEVEL ACCESS REQUIREMENTS — the single global proactive-lock flag,
// so the UI can show the League lock before any registration attempt.
test("levelUnlocked reflects MIN_LEAGUE_PLAYER_LEVEL (7): true at level 50, false below 7", async () => {
  const unlocked = await getLeaguesOverview(PLAYER_ID, NOW);
  assert.equal(unlocked.levelUnlocked, true);

  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 6, experience: 0 });
  const locked = await getLeaguesOverview(PLAYER_ID, NOW);
  assert.equal(locked.levelUnlocked, false);
});
