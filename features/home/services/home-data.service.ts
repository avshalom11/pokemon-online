import "server-only";

import { getTodayBattleCount } from "@/features/daily-battles/services/daily-battle-count.service";
import { getFirstPendingEvolutionBranchView, getFirstPendingEvolutionView } from "@/features/evolution/queries/evolution-queries";
import type { PendingEvolutionBranchView, PendingEvolutionView } from "@/features/evolution/types/evolution.types";
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

  // The safety-net evolution prompt (features/evolution/components/
  // PendingEvolutionGate.tsx) — null unless the player has an unresolved
  // evolution decision left over from a battle they didn't finish
  // deciding on (the primary trigger is in-battle, BattleContent itself;
  // see features/evolution's own architecture notes for why both exist).
  pendingEvolution: PendingEvolutionView | null;

  // Same safety net, for an unresolved Branch Evolution CHOICE instead
  // (Eevee's Espeon/Umbreon fork) — mutually exclusive with pendingEvolution
  // above for any one Pokémon, but both are independently queried since two
  // different owned Pokémon could theoretically each have one pending at
  // once; PendingEvolutionGate only ever surfaces the first one it's given.
  pendingEvolutionBranch: PendingEvolutionBranchView | null;
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
  const [party, stats, dailyBattleCount, pendingEvolution, pendingEvolutionBranch] = await Promise.all([
    getPlayerParty(profile.id),
    getOwnedPokemonStats(profile.id),
    getTodayBattleCount(profile.id),
    getFirstPendingEvolutionView(profile.id),
    getFirstPendingEvolutionBranchView(profile.id),
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
    pendingEvolution,
    pendingEvolutionBranch,
  };
}
