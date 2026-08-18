// GYMS & LEAGUES PHASE 5 — focused coverage for the pure Asia/Jerusalem
// schedule math (sections 3/10/15/19 SCHEDULE items 22-26 of this Phase's
// spec). No DB, no Prisma.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getCurrentLeagueTournamentOccurrenceWindow,
  getLeagueRoundStartTime,
  getLeagueTournamentWeekKey,
  isLeagueRegistrationOpen,
} from "./jerusalem-schedule.ts";
import { LEAGUE_SCHEDULE } from "../config/league-schedule.config.ts";

function jerusalemPartsOf(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { weekday: get("weekday").toLowerCase(), hour: get("hour"), minute: get("minute") };
}

test("the resolved occurrence window always lands on a Jerusalem Thursday at 18:30 (close) and 19:00 (round 1)", () => {
  // A fixed, arbitrary reference instant (a Monday) — deterministic
  // regardless of when this test suite actually runs.
  const now = new Date("2026-01-05T08:00:00Z");
  const window = getCurrentLeagueTournamentOccurrenceWindow(now);

  const close = jerusalemPartsOf(window.registrationClosesAt);
  assert.equal(close.weekday, "thursday");
  assert.equal(close.hour, "18");
  assert.equal(close.minute, "30");

  const round1 = jerusalemPartsOf(window.round1StartsAt);
  assert.equal(round1.weekday, "thursday");
  assert.equal(round1.hour, "19");
  assert.equal(round1.minute, "00");

  assert.ok(window.registrationClosesAt.getTime() < window.round1StartsAt.getTime());
});

test("registration is open before Thursday 18:30 Jerusalem and closed after it", () => {
  const now = new Date("2026-01-05T08:00:00Z"); // Monday
  const window = getCurrentLeagueTournamentOccurrenceWindow(now);

  assert.equal(isLeagueRegistrationOpen(window, now), true);

  const oneMinuteBeforeClose = new Date(window.registrationClosesAt.getTime() - 60_000);
  assert.equal(isLeagueRegistrationOpen(window, oneMinuteBeforeClose), true);

  const oneMinuteAfterClose = new Date(window.registrationClosesAt.getTime() + 60_000);
  assert.equal(isLeagueRegistrationOpen(window, oneMinuteAfterClose), false);
});

test("shortly after Thursday 18:30, the SAME (now-closed) Thursday occurrence is still resolved — registration is genuinely closed, not silently rolled forward", () => {
  const thisWeekWindow = getCurrentLeagueTournamentOccurrenceWindow(new Date("2026-01-05T08:00:00Z"));
  const justAfterClose = new Date(thisWeekWindow.registrationClosesAt.getTime() + 5 * 60_000);

  const resolvedAgain = getCurrentLeagueTournamentOccurrenceWindow(justAfterClose);
  assert.equal(resolvedAgain.registrationClosesAt.getTime(), thisWeekWindow.registrationClosesAt.getTime());
  assert.equal(isLeagueRegistrationOpen(resolvedAgain, justAfterClose), false);
});

test("the following calendar day, the occurrence rolls to NEXT Thursday, open again", () => {
  const thisWeekWindow = getCurrentLeagueTournamentOccurrenceWindow(new Date("2026-01-05T08:00:00Z"));
  const nextDay = new Date(thisWeekWindow.registrationClosesAt.getTime() + 24 * 60 * 60 * 1000);

  const nextWindow = getCurrentLeagueTournamentOccurrenceWindow(nextDay);
  const daysBetween = (nextWindow.registrationClosesAt.getTime() - thisWeekWindow.registrationClosesAt.getTime()) / (24 * 60 * 60 * 1000);
  assert.equal(Math.round(daysBetween), 7);
  assert.equal(isLeagueRegistrationOpen(nextWindow, nextDay), true);
});

test("uses Asia/Jerusalem, not server-local time — verified against LEAGUE_SCHEDULE's own config values", () => {
  assert.equal(LEAGUE_SCHEDULE.timezone, "Asia/Jerusalem");
  const window = getCurrentLeagueTournamentOccurrenceWindow(new Date("2026-06-15T00:00:00Z"));
  const close = jerusalemPartsOf(window.registrationClosesAt);
  assert.equal(close.hour, "18");
  assert.equal(close.minute, "30");
});

test("getLeagueTournamentWeekKey returns the Jerusalem YYYY-MM-DD of the occurrence's own Thursday", () => {
  const window = getCurrentLeagueTournamentOccurrenceWindow(new Date("2026-01-05T08:00:00Z"));
  const weekKey = getLeagueTournamentWeekKey(window.registrationClosesAt);
  assert.match(weekKey, /^\d{4}-\d{2}-\d{2}$/);

  const parts = jerusalemPartsOf(window.registrationClosesAt);
  assert.equal(parts.weekday, "thursday");
});

test("Round 1 starts at the tournament's own round1StartsAt (19:00)", () => {
  const tournamentStart = new Date("2026-01-08T17:00:00Z"); // an arbitrary UTC instant standing in for round1StartsAt
  const round1 = getLeagueRoundStartTime(tournamentStart, 1);
  assert.equal(round1.getTime(), tournamentStart.getTime());
});

test("Round 2 is 30 minutes after Round 1", () => {
  const tournamentStart = new Date("2026-01-08T17:00:00Z");
  const round2 = getLeagueRoundStartTime(tournamentStart, 2);
  assert.equal(round2.getTime() - tournamentStart.getTime(), 30 * 60_000);
});

test("Round 3 is 1 hour after Round 1 (two 30-minute gaps)", () => {
  const tournamentStart = new Date("2026-01-08T17:00:00Z");
  const round3 = getLeagueRoundStartTime(tournamentStart, 3);
  assert.equal(round3.getTime() - tournamentStart.getTime(), 60 * 60_000);
});

test("Round 4 is 1.5 hours after Round 1 (three 30-minute gaps)", () => {
  const tournamentStart = new Date("2026-01-08T17:00:00Z");
  const round4 = getLeagueRoundStartTime(tournamentStart, 4);
  assert.equal(round4.getTime() - tournamentStart.getTime(), 90 * 60_000);
});

test("battle-room active window config is exactly 20 minutes", () => {
  assert.equal(LEAGUE_SCHEDULE.battleRoomActiveWindowMinutes, 20);
});
