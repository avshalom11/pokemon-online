import type { RegionId } from "@/shared/types/region";

// GYMS & LEAGUES PHASE 1 — data-only League foundation. No registration,
// bracket generation, or PvP execution exists yet — see
// features/leagues/data/league-registry.ts's own doc comment for exactly
// what this Phase does and does not implement.
export type RegionalLeagueId = "league-1" | "league-2" | "league-3";
export type LeagueId = RegionalLeagueId | "champions-league";

// One of the 3 Regional Leagues — eligibility (approved design, section
// 14) is always "all 9 Gym Badges across these 3 regions + all 3 Regional
// Champions defeated," never wired to a live query in this Phase.
export interface RegionalLeagueDefinition {
  readonly id: RegionalLeagueId;
  readonly displayName: string;
  readonly regionIds: readonly [RegionId, RegionId, RegionId];
  readonly requiredBadgeCount: number;
  readonly requiredRegionalChampionCount: number;
}

// The Champions League's 4 qualifier slots (approved design, section 14) —
// League I/II/III's own winner, plus League III's runner-up specifically
// (never League I's or II's runner-up). No normal registration-eligibility
// rule exists yet for the Champions League itself; only this qualification
// design is stored.
export type ChampionsLeagueQualifierSource = "league-1-winner" | "league-2-winner" | "league-3-winner" | "league-3-runner-up";

export interface ChampionsLeagueDefinition {
  readonly id: "champions-league";
  readonly displayName: string;
  readonly qualifierSources: readonly [
    ChampionsLeagueQualifierSource,
    ChampionsLeagueQualifierSource,
    ChampionsLeagueQualifierSource,
    ChampionsLeagueQualifierSource,
  ];
}
