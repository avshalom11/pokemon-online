// LEAGUE CYCLE ALIGNMENT + "HOW LEAGUES WORK" DIALOG (later task) — the ONE
// place the 4-week cycle's own Hebrew display labels live, indexed exactly
// like league-cycle.ts's own CYCLE_ORDER / getCycleWeekIndex (0=League I,
// 1=League II, 2=League III, 3=Champions League). Both LeaguesContent's own
// top banner and HowLeaguesWorkDialog read this SAME array — never two
// separate copies of "which League is active this week" wording.
export const CYCLE_WEEK_LABELS = ["ליגה I", "ליגה II", "ליגה III", "ליגת האלופים"] as const;
