import "server-only";

import { hasBadge, isRegionalChampionDefeated } from "@/features/gyms/services/gym-progression.service";
import type { RegionalLeagueDefinition } from "../types/league.types";
import { isEligibleForRegionalLeague } from "../data/league-registry";

// GYMS & LEAGUES PHASE 5 — the ONLY place a player's live Gym progression is
// aggregated into League eligibility (section 2 of this Phase's spec).
// Composes Phase 1's own pure isEligibleForRegionalLeague (league-registry.ts)
// with Phase 1-3's own DB-backed Gym progression reads (hasBadge,
// isRegionalChampionDefeated — gym-progression.service.ts) — no duplicate
// eligibility state is ever created or cached; every check re-derives from
// the real Badge/Champion rows at call time.

export interface LeagueEligibilityResult {
  readonly eligible: boolean;
  readonly badgeCount: number;
  readonly regionalChampionCount: number;
}

const GYM_NUMBERS: readonly (1 | 2 | 3)[] = [1, 2, 3];

export async function getLeagueEligibility(playerId: string, league: RegionalLeagueDefinition): Promise<LeagueEligibilityResult> {
  const badgeChecks = await Promise.all(
    league.regionIds.flatMap((regionId) => GYM_NUMBERS.map((gymNumber) => hasBadge(playerId, regionId, gymNumber)))
  );
  const championChecks = await Promise.all(league.regionIds.map((regionId) => isRegionalChampionDefeated(playerId, regionId)));

  const badgeCount = badgeChecks.filter(Boolean).length;
  const regionalChampionCount = championChecks.filter(Boolean).length;

  return {
    eligible: isEligibleForRegionalLeague(league, badgeCount, regionalChampionCount),
    badgeCount,
    regionalChampionCount,
  };
}
