import type {
  ChampionsLeagueDefinition,
  RegionalLeagueDefinition,
} from "../types/league.types";

// GYMS & LEAGUES PHASE 1 — League DEFINITIONS ONLY. No registration,
// tournament bracket, PvP room, timer/job, or reward exists yet — see
// sections 14-17 of this Phase's own spec for the exact list of what's
// deliberately deferred to later phases. This file only stores which
// regions belong to which League and the (unwired) eligibility numbers.

export const LEAGUE_I: RegionalLeagueDefinition = {
  id: "league-1",
  displayName: "League I",
  regionIds: ["kanto", "johto", "hoenn"],
  requiredBadgeCount: 9,
  requiredRegionalChampionCount: 3,
};

export const LEAGUE_II: RegionalLeagueDefinition = {
  id: "league-2",
  displayName: "League II",
  regionIds: ["sinnoh", "unova", "kalos"],
  requiredBadgeCount: 9,
  requiredRegionalChampionCount: 3,
};

export const LEAGUE_III: RegionalLeagueDefinition = {
  id: "league-3",
  displayName: "League III",
  regionIds: ["alola", "galar", "paldea"],
  requiredBadgeCount: 9,
  requiredRegionalChampionCount: 3,
};

export const REGIONAL_LEAGUES: readonly RegionalLeagueDefinition[] = [LEAGUE_I, LEAGUE_II, LEAGUE_III];

// Exactly 4 qualifier slots (approved design, section 14) — League I/II/III
// winners, plus League III's own runner-up. Qualification/tournament-result
// persistence does not exist yet; this is only the approved slot design.
export const CHAMPIONS_LEAGUE: ChampionsLeagueDefinition = {
  id: "champions-league",
  displayName: "Champions League",
  qualifierSources: ["league-1-winner", "league-2-winner", "league-3-winner", "league-3-runner-up"],
};

export function getRegionalLeagueById(leagueId: "league-1" | "league-2" | "league-3"): RegionalLeagueDefinition {
  return REGIONAL_LEAGUES.find((league) => league.id === leagueId)!;
}

// Pure eligibility check against already-known counts — never queries the
// database itself (that belongs to whichever future phase wires this up
// to real badge/champion progression). Exists now purely so the approved
// "9 badges + 3 champions" rule (section 14) is expressed as one real,
// testable function rather than only as a comment.
export function isEligibleForRegionalLeague(league: RegionalLeagueDefinition, badgeCount: number, regionalChampionCount: number): boolean {
  return badgeCount >= league.requiredBadgeCount && regionalChampionCount >= league.requiredRegionalChampionCount;
}
