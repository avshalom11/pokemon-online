import type { LeagueId } from "../types/league.types";

// GYMS & LEAGUES PHASE 8 — deterministic, not-yet-populated artwork paths
// for League Trophies/Medals (section 30), same "/images/<category>/..."
// convention gym-badges.ts/regional-medals.ts already established for Gym
// achievements. No files are generated here — place the real assets at
// these exact paths later; nothing else needs to change.
const LEAGUE_MEDIA_ROOT = "/images/leagues";

export function leagueTrophyImageUrl(leagueId: LeagueId): string {
  return `${LEAGUE_MEDIA_ROOT}/trophies/${leagueId}.png`;
}

export type LeagueMedalTier = "silver" | "bronze";

export function leagueMedalImageUrl(tier: LeagueMedalTier): string {
  return `${LEAGUE_MEDIA_ROOT}/medals/${tier}.png`;
}
