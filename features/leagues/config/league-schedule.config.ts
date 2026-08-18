// GYMS & LEAGUES PHASE 1 — the ONE central schedule/config source of truth
// for League registration/tournament timing (approved design, section 15).
// No timers, jobs, cron, or automation exist yet, and registration itself
// is not implemented — this is config only, for a future Phase 5 to read
// rather than re-deciding these numbers. `timezone` matches this project's
// existing day-boundary convention (Asia/Jerusalem — see
// getJerusalemDateKey, features/daily-battles/services/daily-battle-count.service.ts)
// so "Thursday" here means Thursday in that same timezone, not the
// server's own.
export const LEAGUE_SCHEDULE = {
  timezone: "Asia/Jerusalem",

  // Registration is open all week and closes Thursday at 18:30.
  registrationClosesDayOfWeek: "thursday",
  registrationClosesTime: "18:30",

  // Round 1 begins 30 minutes after registration closes.
  round1StartsDayOfWeek: "thursday",
  round1StartsTime: "19:00",

  // Gap between tournament rounds, and how long each individual battle
  // room stays active/enterable once its round starts.
  minutesBetweenRounds: 30,
  battleRoomActiveWindowMinutes: 20,
} as const;
