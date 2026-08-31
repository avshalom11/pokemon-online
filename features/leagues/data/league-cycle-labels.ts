import type { LeagueId } from "../types/league.types";

// LEAGUE CYCLE ALIGNMENT + "HOW LEAGUES WORK" DIALOG (later task) — the ONE
// place the 4-week cycle's own Hebrew display labels live, indexed exactly
// like league-cycle.ts's own CYCLE_ORDER / getCycleWeekIndex (0=League I,
// 1=League II, 2=League III, 3=Champions League). Both LeaguesContent's own
// top banner and HowLeaguesWorkDialog read this SAME array — never two
// separate copies of "which League is active this week" wording.
export const CYCLE_WEEK_LABELS = ["ליגה I", "ליגה II", "ליגה III", "ליגת האלופים"] as const;

// LEAGUE AWARDS — the same fixed League order CYCLE_WEEK_LABELS above and
// league-cycle.ts's own CYCLE_ORDER already use, restated here (never
// imported from league-cycle.ts, which keeps its own ordering array
// private) purely so a leagueId can be turned into its CYCLE_WEEK_LABELS
// entry — the ONE Hebrew League name this project already has, reused by
// the Profile Achievements section rather than a second hardcoded name.
const LEAGUE_ID_ORDER: readonly LeagueId[] = ["league-1", "league-2", "league-3", "champions-league"];

export function getLeagueDisplayNameHe(leagueId: LeagueId): string {
  return CYCLE_WEEK_LABELS[LEAGUE_ID_ORDER.indexOf(leagueId)]!;
}
