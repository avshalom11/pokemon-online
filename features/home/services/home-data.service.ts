import "server-only";

import { getTrainerProgress, type TrainerProgress } from "@/engine/player/trainer-progress";
import { formatTrainerId } from "@/features/home/services/trainer-id";
import { getOwnedPokemonStats, getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

export interface HomeViewData {
  displayName: string;
  trainerId: string;

  level: number;
  xp: TrainerProgress;

  coins: number;
  gems: number;

  party: OwnedPokemon[];

  stats: {
    totalCaught: number;
    dexCompletionPercent: number;
  };
}

// Single aggregator for everything app/home/page.tsx needs, so the page
// itself stays a thin display layer (per PROJECT_RULES: "pages should
// display data") instead of juggling four separate data calls itself.
export async function getHomeViewData(userId: string): Promise<HomeViewData> {
  const profile = await getPlayerProfile(userId);
  const [party, stats] = await Promise.all([getPlayerParty(profile.id), getOwnedPokemonStats(profile.id)]);

  const dexSize = POKEMON_DATA.length;
  const dexCompletionPercent = dexSize > 0 ? Math.round((stats.uniqueSpeciesCaught / dexSize) * 100) : 0;

  return {
    displayName: profile.displayName,
    trainerId: formatTrainerId(profile.id),
    level: profile.level,
    xp: getTrainerProgress(profile.level, profile.experience),
    coins: profile.coins,
    gems: profile.gems,
    party,
    stats: {
      totalCaught: stats.totalCaught,
      dexCompletionPercent,
    },
  };
}
