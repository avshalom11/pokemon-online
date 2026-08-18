import assert from "node:assert/strict";
import { test } from "node:test";

import { LEAGUE_SCHEDULE } from "./league-schedule.config.ts";

test("registration closes Thursday at 18:30", () => {
  assert.equal(LEAGUE_SCHEDULE.registrationClosesDayOfWeek, "thursday");
  assert.equal(LEAGUE_SCHEDULE.registrationClosesTime, "18:30");
});

test("round 1 starts Thursday at 19:00", () => {
  assert.equal(LEAGUE_SCHEDULE.round1StartsDayOfWeek, "thursday");
  assert.equal(LEAGUE_SCHEDULE.round1StartsTime, "19:00");
});

test("30 minutes between rounds, 20-minute battle room active window", () => {
  assert.equal(LEAGUE_SCHEDULE.minutesBetweenRounds, 30);
  assert.equal(LEAGUE_SCHEDULE.battleRoomActiveWindowMinutes, 20);
});
