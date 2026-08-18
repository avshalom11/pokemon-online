import { CHAMPIONS_LEAGUE, LEAGUE_I, LEAGUE_II, LEAGUE_III } from "../data/league-registry";
import type { LeagueId } from "../types/league.types";
import { getCurrentLeagueTournamentOccurrenceWindow, getLeagueTournamentWeekKey } from "./jerusalem-schedule";

// GYMS & LEAGUES PHASE 8 — the 4-week League rotation (section 1). Phase 5
// treated every regional League as independently registerable every single
// week (audited — confirmed true: registerForLeague only ever checked
// eligibility + the registration window, never which League a given week
// is "for"). This file is the one, smallest addition needed to correct
// that: it never creates a second schedule system — every date/DST
// concern still flows entirely through the EXISTING
// getCurrentLeagueTournamentOccurrenceWindow/getLeagueTournamentWeekKey
// (jerusalem-schedule.ts); this file only adds "which League does THIS
// Thursday belong to".
//
// ONE anchor constant, never scattered hardcoded dates: 2026-01-08 is a
// real Jerusalem Thursday (verified) — the same week every existing Phase
// 5-7 registration test already implicitly treats as "League I's week" —
// and is defined here as cycle position 0 (League I's week). Every other
// Thursday's own position is computed purely as a whole-week offset from
// this single anchor, modulo 4 — so correcting/moving the anchor later is
// always a one-line change, never a search-and-replace.
const CYCLE_ANCHOR_WEEK_KEY = "2026-01-08";

// Cycle order (section 1): League I -> League II -> League III -> Champions
// League, then repeats. Also doubles as each League's own 0-based OFFSET
// (in weeks) from its cycle's own start — League II's own Thursday is
// always exactly 1 week after that cycle's League I Thursday, etc.
const CYCLE_ORDER: readonly LeagueId[] = [LEAGUE_I.id, LEAGUE_II.id, LEAGUE_III.id, CHAMPIONS_LEAGUE.id];

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function weekKeyToUtcMidnight(weekKey: string): number {
  const [year, month, day] = weekKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function utcMidnightToWeekKey(ms: number): string {
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// The 0-based position of `weekKey` within the 4-week cycle (0=League I,
// 1=League II, 2=League III, 3=Champions League). Pure calendar-date
// arithmetic — weekKey is always a Thursday (produced by
// getLeagueTournamentWeekKey), so the difference from the anchor Thursday
// is always an exact whole number of weeks; no DST concern here since this
// never touches a time-of-day, only calendar dates already resolved in
// Jerusalem.
export function getCycleWeekIndex(weekKey: string): number {
  const weeksSinceAnchor = Math.round((weekKeyToUtcMidnight(weekKey) - weekKeyToUtcMidnight(CYCLE_ANCHOR_WEEK_KEY)) / MS_PER_WEEK);
  return ((weeksSinceAnchor % 4) + 4) % 4;
}

export function getLeagueForCycleWeek(weekKey: string): LeagueId {
  return CYCLE_ORDER[getCycleWeekIndex(weekKey)];
}

export function isLeagueActiveThisWeek(leagueId: LeagueId, weekKey: string): boolean {
  return getLeagueForCycleWeek(weekKey) === leagueId;
}

// The stable identity of the 4-week cycle `weekKey` belongs to — the
// weekKey of THAT cycle's own League I week (section 4's "minimum clean
// cycle identity"). Two different weeks that fall in the same 4-week
// rotation always produce the SAME cycleKey, which is what lets Champions
// qualification correlate League I/II/III results from one cycle without
// ever mixing in an old cycle's leftover winner.
export function getCycleKey(weekKey: string): string {
  const index = getCycleWeekIndex(weekKey);
  return utcMidnightToWeekKey(weekKeyToUtcMidnight(weekKey) - index * MS_PER_WEEK);
}

// The exact weekKey `leagueId` occupies within the cycle identified by
// `cycleKey` — computed directly from CYCLE_ORDER's own index (each
// League's fixed week-offset from its cycle's start), never searched for.
export function getWeekKeyForLeagueInCycle(leagueId: LeagueId, cycleKey: string): string {
  const offset = CYCLE_ORDER.indexOf(leagueId);
  return utcMidnightToWeekKey(weekKeyToUtcMidnight(cycleKey) + offset * MS_PER_WEEK);
}

export interface CurrentLeagueCycle {
  readonly weekKey: string;
  readonly cycleKey: string;
  readonly activeLeagueId: LeagueId;
}

// The current cycle position as of `now` — reuses the EXISTING occurrence-
// window resolver for "which Thursday is the current/upcoming one",
// exactly the same weekKey every registration/generation call already
// keys off of.
export function getCurrentLeagueCycle(now: Date = new Date()): CurrentLeagueCycle {
  const window = getCurrentLeagueTournamentOccurrenceWindow(now);
  const weekKey = getLeagueTournamentWeekKey(window.registrationClosesAt);
  return { weekKey, cycleKey: getCycleKey(weekKey), activeLeagueId: getLeagueForCycleWeek(weekKey) };
}
