import { LEAGUE_SCHEDULE } from "../config/league-schedule.config";

// GYMS & LEAGUES PHASE 7 — pure match-room-window math (section 1/2).
// Reuses LEAGUE_SCHEDULE.battleRoomActiveWindowMinutes (Phase 1/5) as the
// only source of the "20 minutes" figure — never hardcoded again here.
// The server clock is authoritative everywhere this is used; every caller
// passes its own `now` (defaulting to `new Date()`), never a client-
// supplied timestamp.

export interface LeagueMatchRoomWindow {
  readonly opensAt: Date;
  readonly closesAt: Date;
}

export function getLeagueMatchRoomWindow(scheduledAt: Date): LeagueMatchRoomWindow {
  return {
    opensAt: scheduledAt,
    closesAt: new Date(scheduledAt.getTime() + LEAGUE_SCHEDULE.battleRoomActiveWindowMinutes * 60_000),
  };
}

export type LeagueMatchWindowState = "not-open-yet" | "open" | "expired";

// scheduledAt <= now < scheduledAt + 20min → "open" (section 2). Before
// that → "not-open-yet" (no join/action allowed at all). At/after the
// close instant → "expired" (the HARD deadline, section 3 — no new
// actions accepted, the match must be resolved through Phase 7's own
// resolution service rather than continuing gameplay).
export function getLeagueMatchWindowState(scheduledAt: Date, now: Date = new Date()): LeagueMatchWindowState {
  const window = getLeagueMatchRoomWindow(scheduledAt);
  if (now.getTime() < window.opensAt.getTime()) return "not-open-yet";
  if (now.getTime() >= window.closesAt.getTime()) return "expired";
  return "open";
}
