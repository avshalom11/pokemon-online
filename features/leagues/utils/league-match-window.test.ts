// GYMS & LEAGUES PHASE 7 — focused coverage for the pure match-room-window
// helper (MATCH WINDOW items 1-7 that are pure-function-testable). No DB.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getLeagueMatchRoomWindow, getLeagueMatchWindowState } from "./league-match-window.ts";
import { LEAGUE_SCHEDULE } from "../config/league-schedule.config.ts";

const SCHEDULED_AT = new Date("2026-01-08T17:00:00Z");

test("the room window is exactly [scheduledAt, scheduledAt + 20min)", () => {
  const window = getLeagueMatchRoomWindow(SCHEDULED_AT);
  assert.equal(window.opensAt.getTime(), SCHEDULED_AT.getTime());
  assert.equal(window.closesAt.getTime() - SCHEDULED_AT.getTime(), LEAGUE_SCHEDULE.battleRoomActiveWindowMinutes * 60_000);
});

test("before scheduledAt the window state is not-open-yet", () => {
  const before = new Date(SCHEDULED_AT.getTime() - 1000);
  assert.equal(getLeagueMatchWindowState(SCHEDULED_AT, before), "not-open-yet");
});

test("exactly at scheduledAt the window is open", () => {
  assert.equal(getLeagueMatchWindowState(SCHEDULED_AT, SCHEDULED_AT), "open");
});

test("just before the 20-minute deadline the window is still open", () => {
  const almostExpired = new Date(SCHEDULED_AT.getTime() + 19 * 60_000 + 59_000);
  assert.equal(getLeagueMatchWindowState(SCHEDULED_AT, almostExpired), "open");
});

test("exactly at the 20-minute deadline the window is expired", () => {
  const deadline = new Date(SCHEDULED_AT.getTime() + 20 * 60_000);
  assert.equal(getLeagueMatchWindowState(SCHEDULED_AT, deadline), "expired");
});

test("well after the deadline the window remains expired", () => {
  const wayLater = new Date(SCHEDULED_AT.getTime() + 60 * 60_000);
  assert.equal(getLeagueMatchWindowState(SCHEDULED_AT, wayLater), "expired");
});
