// GYMS & LEAGUES PHASE 8 — focused coverage for the 4-week League rotation
// (SCHEDULE items 1-8). Pure functions, no DB.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getCurrentLeagueCycle,
  getCycleKey,
  getCycleWeekIndex,
  getLeagueForCycleWeek,
  getWeekKeyForLeagueInCycle,
  isLeagueActiveThisWeek,
} from "./league-cycle.ts";
import { getCurrentLeagueTournamentOccurrenceWindow, getLeagueTournamentWeekKey } from "./jerusalem-schedule.ts";

// The anchor week (League I's own week 0) — verified elsewhere to be a
// real Jerusalem Thursday.
const WEEK_1_LEAGUE_I = "2026-01-08";
const WEEK_2_LEAGUE_II = "2026-01-15";
const WEEK_3_LEAGUE_III = "2026-01-22";
const WEEK_4_CHAMPIONS = "2026-01-29";
const WEEK_5_LEAGUE_I_AGAIN = "2026-02-05";

test("week 1 -> League I", () => {
  assert.equal(getLeagueForCycleWeek(WEEK_1_LEAGUE_I), "league-1");
  assert.equal(getCycleWeekIndex(WEEK_1_LEAGUE_I), 0);
});

test("week 2 -> League II", () => {
  assert.equal(getLeagueForCycleWeek(WEEK_2_LEAGUE_II), "league-2");
});

test("week 3 -> League III", () => {
  assert.equal(getLeagueForCycleWeek(WEEK_3_LEAGUE_III), "league-3");
});

test("week 4 -> Champions League", () => {
  assert.equal(getLeagueForCycleWeek(WEEK_4_CHAMPIONS), "champions-league");
});

test("the cycle repeats after week 4 — week 5 is League I again", () => {
  assert.equal(getLeagueForCycleWeek(WEEK_5_LEAGUE_I_AGAIN), "league-1");
  assert.equal(getCycleWeekIndex(WEEK_5_LEAGUE_I_AGAIN), 0);
});

test("only the active regional League for a given week reports isLeagueActiveThisWeek true", () => {
  assert.equal(isLeagueActiveThisWeek("league-1", WEEK_1_LEAGUE_I), true);
  assert.equal(isLeagueActiveThisWeek("league-2", WEEK_1_LEAGUE_I), false);
  assert.equal(isLeagueActiveThisWeek("league-3", WEEK_1_LEAGUE_I), false);
  assert.equal(isLeagueActiveThisWeek("champions-league", WEEK_1_LEAGUE_I), false);
});

test("Champions week reports every regional League as inactive (no manual registration ever applies)", () => {
  for (const leagueId of ["league-1", "league-2", "league-3"] as const) {
    assert.equal(isLeagueActiveThisWeek(leagueId, WEEK_4_CHAMPIONS), false);
  }
});

test("getCycleKey is identical for every week within the same 4-week cycle", () => {
  const cycleKey = getCycleKey(WEEK_1_LEAGUE_I);
  assert.equal(getCycleKey(WEEK_2_LEAGUE_II), cycleKey);
  assert.equal(getCycleKey(WEEK_3_LEAGUE_III), cycleKey);
  assert.equal(getCycleKey(WEEK_4_CHAMPIONS), cycleKey);
  assert.notEqual(getCycleKey(WEEK_5_LEAGUE_I_AGAIN), cycleKey, "the NEXT cycle must have its own distinct cycleKey");
});

test("getWeekKeyForLeagueInCycle inverts getCycleKey for every League in the same cycle", () => {
  const cycleKey = getCycleKey(WEEK_1_LEAGUE_I);
  assert.equal(getWeekKeyForLeagueInCycle("league-1", cycleKey), WEEK_1_LEAGUE_I);
  assert.equal(getWeekKeyForLeagueInCycle("league-2", cycleKey), WEEK_2_LEAGUE_II);
  assert.equal(getWeekKeyForLeagueInCycle("league-3", cycleKey), WEEK_3_LEAGUE_III);
  assert.equal(getWeekKeyForLeagueInCycle("champions-league", cycleKey), WEEK_4_CHAMPIONS);
});

test("getCurrentLeagueCycle reuses the existing Jerusalem occurrence-window resolver, never a second schedule system", () => {
  const now = new Date("2026-01-05T08:00:00Z"); // a Monday whose upcoming Thursday (Jan 8) is League I's own week
  const window = getCurrentLeagueTournamentOccurrenceWindow(now);
  const expectedWeekKey = getLeagueTournamentWeekKey(window.registrationClosesAt);

  const cycle = getCurrentLeagueCycle(now);
  assert.equal(cycle.weekKey, expectedWeekKey);
  assert.equal(cycle.activeLeagueId, "league-1");
});

test("DST does not affect which League is active — an early-summer week still resolves consistently", () => {
  // A date far enough into the year that Asia/Jerusalem DST (summer time)
  // is in effect — the cycle math is pure calendar-date arithmetic and
  // must be unaffected by the underlying UTC offset shift.
  const now = new Date("2026-06-15T08:00:00Z");
  const window = getCurrentLeagueTournamentOccurrenceWindow(now);
  const weekKey = getLeagueTournamentWeekKey(window.registrationClosesAt);
  const league = getLeagueForCycleWeek(weekKey);
  assert.ok(["league-1", "league-2", "league-3", "champions-league"].includes(league));
});
