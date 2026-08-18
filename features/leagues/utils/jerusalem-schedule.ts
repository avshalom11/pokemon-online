// GYMS & LEAGUES PHASE 5 — pure, framework-free Asia/Jerusalem schedule math
// (section 3/10/15 of this Phase's spec). No Prisma, no React, no
// "server-only" — mirrors this codebase's own "pure formulas separate from
// the server-only service that persists their results" convention
// (progression-calculations.ts, party-rules.ts, gym-progression-rules.ts).
//
// This project has exactly one existing Jerusalem-time utility
// (getJerusalemDateKey, features/daily-battles/services/
// daily-battle-count.service.ts), and it only answers "what calendar date
// is it" — it can't resolve "the next Thursday 18:30 Jerusalem" into a real
// UTC instant, which League scheduling needs. Rather than pull in a
// timezone library (none exists in this project), this file uses the same
// Intl.DateTimeFormat-based technique getJerusalemDateKey already
// established, extended with the standard "guess a UTC instant, read back
// what wall-clock time that instant shows in the target zone, correct by
// the difference" conversion every timezone-aware library (date-fns-tz,
// Luxon) uses internally — automatically DST-correct with no manual
// UTC+2/UTC+3 branching.

import { LEAGUE_SCHEDULE } from "../config/league-schedule.config";

const JERUSALEM_TIME_ZONE = LEAGUE_SCHEDULE.timezone;

interface WallClockParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function readWallClockParts(instant: Date, timeZone: string): WallClockParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  // Intl renders midnight as "24" for hour12:false in some environments —
  // normalized to 0 so the numeric wall-clock math below stays correct.
  const hour = get("hour") % 24;

  return { year: get("year"), month: get("month"), day: get("day"), hour, minute: get("minute"), second: get("second") };
}

// Converts a WALL-CLOCK date/time in `timeZone` into the real UTC instant
// it represents — the "guess, read back, correct" technique: Date.UTC on
// the desired components gives a first guess; formatting that guess back
// into `timeZone` reveals the zone's current offset (as the delta between
// what we asked for and what that guess actually shows); one correction
// pass resolves it exactly, since Asia/Jerusalem's DST transitions are
// whole-hour and never occur mid-formatting-pass here.
function zonedTimeToUtc(parts: WallClockParts, timeZone: string): Date {
  const guessMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const shown = readWallClockParts(new Date(guessMs), timeZone);
  const shownAsUtcMs = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second);
  const offsetMs = shownAsUtcMs - guessMs;
  return new Date(guessMs - offsetMs);
}

// "HH:MM" -> { hour, minute }. LEAGUE_SCHEDULE stores times this way
// (registrationClosesTime/round1StartsTime) — parsed here rather than at
// every call site.
function parseTimeOfDay(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(":").map(Number);
  return { hour, minute };
}

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// The Jerusalem calendar date (Y/M/D, weekday-independent of any time
// component) `instant` falls on — day-of-week only depends on the calendar
// date once resolved in the target zone, so Date.UTC(...).getUTCDay() on
// those same Y/M/D components is a correct, timezone-independent way to
// compute the weekday.
function jerusalemCalendarDate(instant: Date): { year: number; month: number; day: number; weekdayIndex: number } {
  const { year, month, day } = readWallClockParts(instant, JERUSALEM_TIME_ZONE);
  const weekdayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, weekdayIndex };
}

function addDaysToCalendarDate(date: { year: number; month: number; day: number }, days: number): { year: number; month: number; day: number } {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

export interface LeagueTournamentOccurrenceWindow {
  readonly registrationClosesAt: Date;
  readonly round1StartsAt: Date;
}

// The one weekly-occurrence resolver every registration/generation call
// goes through (section 3/5) — "the current/upcoming weekly tournament
// instance" as of `now`. Picks THIS CALENDAR WEEK's Thursday (Jerusalem) —
// today's own Thursday if today already IS Thursday, otherwise the next
// upcoming one — purely from the calendar DATE, deliberately never
// factoring in time-of-day when choosing WHICH Thursday. Whether that
// occurrence's registration is still open is then a separate, later
// question (isLeagueRegistrationOpen): once today's own Thursday 18:30
// passes, THIS function keeps resolving to that same (now-closed)
// Thursday for the rest of the day — registration is genuinely closed
// until the calendar date itself advances past Thursday, at which point a
// fresh call naturally picks the FOLLOWING week's Thursday, open again.
// This is what makes "registration closed" (section 4) an actually
// reachable, observable state rather than a window that silently
// auto-advances the instant it closes.
export function getCurrentLeagueTournamentOccurrenceWindow(now: Date = new Date()): LeagueTournamentOccurrenceWindow {
  const today = jerusalemCalendarDate(now);
  const thursdayIndex = WEEKDAY_INDEX[LEAGUE_SCHEDULE.registrationClosesDayOfWeek];
  const daysUntilThursday = (thursdayIndex - today.weekdayIndex + 7) % 7;

  const closeTime = parseTimeOfDay(LEAGUE_SCHEDULE.registrationClosesTime);
  const round1Time = parseTimeOfDay(LEAGUE_SCHEDULE.round1StartsTime);

  const targetDate = daysUntilThursday === 0 ? today : addDaysToCalendarDate(today, daysUntilThursday);
  const registrationClosesAt = zonedTimeToUtc(
    { year: targetDate.year, month: targetDate.month, day: targetDate.day, hour: closeTime.hour, minute: closeTime.minute, second: 0 },
    JERUSALEM_TIME_ZONE
  );

  const round1StartsAt = zonedTimeToUtc(
    { year: targetDate.year, month: targetDate.month, day: targetDate.day, hour: round1Time.hour, minute: round1Time.minute, second: 0 },
    JERUSALEM_TIME_ZONE
  );

  return { registrationClosesAt, round1StartsAt };
}

// GYMS & LEAGUES PHASE 8 — the same occurrence-window math as
// getCurrentLeagueTournamentOccurrenceWindow above, but for an ALREADY-
// KNOWN weekKey (the YYYY-MM-DD Jerusalem date of that Thursday) rather
// than "whichever Thursday is closest to now". Needed once tournaments can
// be addressed by a weekKey computed ahead of time (the 4-week cycle
// helpers, league-cycle.ts) — e.g. resolving League II's own
// registrationClosesAt/round1StartsAt for a cycle that hasn't reached that
// week yet.
export function getOccurrenceWindowForWeekKey(weekKey: string): LeagueTournamentOccurrenceWindow {
  const [year, month, day] = weekKey.split("-").map(Number);
  const closeTime = parseTimeOfDay(LEAGUE_SCHEDULE.registrationClosesTime);
  const round1Time = parseTimeOfDay(LEAGUE_SCHEDULE.round1StartsTime);

  const registrationClosesAt = zonedTimeToUtc({ year, month, day, hour: closeTime.hour, minute: closeTime.minute, second: 0 }, JERUSALEM_TIME_ZONE);
  const round1StartsAt = zonedTimeToUtc({ year, month, day, hour: round1Time.hour, minute: round1Time.minute, second: 0 }, JERUSALEM_TIME_ZONE);

  return { registrationClosesAt, round1StartsAt };
}

// The stable per-occurrence dedupe key (section 5/11) — the Asia/Jerusalem
// calendar date (YYYY-MM-DD) of that occurrence's own Thursday, formatted
// with the exact same Intl/en-CA technique getJerusalemDateKey already
// established, so this project has only one "how do we format a Jerusalem
// date" implementation.
export function getLeagueTournamentWeekKey(registrationClosesAt: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: JERUSALEM_TIME_ZONE }).format(registrationClosesAt);
}

// Registration is open for `window` iff `now` is strictly before that
// occurrence's own registrationClosesAt — the single place this yes/no
// question is answered (section 3/4).
export function isLeagueRegistrationOpen(window: LeagueTournamentOccurrenceWindow, now: Date = new Date()): boolean {
  return now.getTime() < window.registrationClosesAt.getTime();
}

// ROUND SCHEDULING (section 10) — Round 1 starts at `tournamentStart`;
// every subsequent round is `minutesBetweenRounds` later. Pure, no
// hardcoded per-round times anywhere else.
export function getLeagueRoundStartTime(tournamentStart: Date, roundNumber: number): Date {
  const offsetMinutes = (Math.max(1, Math.floor(roundNumber)) - 1) * LEAGUE_SCHEDULE.minutesBetweenRounds;
  return new Date(tournamentStart.getTime() + offsetMinutes * 60_000);
}
