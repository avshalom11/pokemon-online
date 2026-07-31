import "server-only";

import { getTodayBattleCount } from "@/features/daily-battles/services/daily-battle-count.service";
import { getOwnedPokemonStats, getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

export interface HomeViewData {
  party: OwnedPokemon[];

  stats: {
    totalCaught: number;
    dexCompletionPercent: number;
  };

  // Today's (Asia/Jerusalem) wild-Pokémon-victory count — see
  // features/daily-battles/services/daily-battle-count.service.ts for what
  // counts as an increment (only a confirmed defeat, never starting/
  // restoring a battle, escaping, or capturing). Home-only: never fetched
  // or shown by Map/Battle.
  dailyBattleCount: number;
}

// Single aggregator for everything app/(game)/home/page.tsx needs, so the
// page itself stays a thin display layer (per PROJECT_RULES: "pages should
// display data") instead of juggling calls itself. Profile-level display
// fields (displayName, level, xp, coins, gold) live in
// features/player/services/player-header-data.service.ts instead — the
// global header (app/(game)/layout.tsx) is the only thing that needs them,
// so they're not duplicated here.
export async function getHomeViewData(userId: string): Promise<HomeViewData> {
  const profile = await getPlayerProfile(userId);
  const [party, stats, dailyBattleCount] = await Promise.all([
    getPlayerParty(profile.id),
    getOwnedPokemonStats(profile.id),
    getTodayBattleCount(profile.id),
  ]);

  const dexSize = POKEMON_DATA.length;
  const dexCompletionPercent = dexSize > 0 ? Math.round((stats.uniqueSpeciesCaught / dexSize) * 100) : 0;

  return {
    party,
    stats: {
      totalCaught: stats.totalCaught,
      dexCompletionPercent,
    },
    dailyBattleCount,
  };
}
