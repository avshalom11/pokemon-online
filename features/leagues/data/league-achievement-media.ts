import type { LeagueId } from "../types/league.types";

// LEAGUE AWARDS — PER-LEAGUE TROPHIES/MEDALS. The 12 real award images (4
// Leagues x 3 placements) live at
// public/images/leagues/awards/{tier}-{leagueNumber}.png. `leagueNumber` is
// this project's own fixed League ordering (league-1=1, league-2=2,
// league-3=3, champions-league=4 — the same order CYCLE_WEEK_LABELS/
// league-cycle.ts's own CYCLE_ORDER already use), never re-derived
// differently in a second place. `tier` is "gold"/"silver" for 1st/2nd
// place; 3rd place is "arad" — deliberately NOT "bronze" — the literal
// filenames on disk are arad-*.png and must never be renamed.
const LEAGUE_AWARD_NUMBER: Record<LeagueId, number> = {
  "league-1": 1,
  "league-2": 2,
  "league-3": 3,
  "champions-league": 4,
};

const LEAGUE_AWARD_TIER: Record<1 | 2 | 3, "gold" | "silver" | "arad"> = {
  1: "gold",
  2: "silver",
  3: "arad",
};

const LEAGUE_AWARD_MEDIA_ROOT = "/images/leagues/awards";

// THE one canonical resolver — every League/placement combination (4
// Leagues x 3 places = all 12 real files on disk) always resolves through
// this single function; no caller ever builds an award image path itself.
// Replaces the old, now-removed leagueTrophyImageUrl/leagueMedalImageUrl
// (which pointed at a generic, never-populated /trophies//medals/ layout)
// — every previous caller of those now reads this instead.
export function leagueAwardImageUrl(leagueId: LeagueId, place: 1 | 2 | 3): string {
  return `${LEAGUE_AWARD_MEDIA_ROOT}/${LEAGUE_AWARD_TIER[place]}-${LEAGUE_AWARD_NUMBER[leagueId]}.png`;
}
