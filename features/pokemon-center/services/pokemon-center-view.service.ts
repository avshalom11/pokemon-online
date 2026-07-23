import "server-only";

import { getTrainerProgress, type TrainerProgress } from "@/engine/player/trainer-progress";
import { formatTrainerId } from "@/features/home/services/trainer-id";
import { getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

export interface PokemonCenterViewData {
  displayName: string;
  trainerId: string;

  level: number;
  xp: TrainerProgress;

  coins: number;
  gems: number;

  party: OwnedPokemon[];
}

// Aggregator for app/pokemon-center/page.tsx, same role as
// home-data.service.ts / my-pokemon-view.service.ts — keeps the page a thin
// display layer. Only the active party is fetched (not the full collection):
// healing only ever applies to active-party members, so nothing else is
// needed here. The non-party fields mirror HomeViewData's shape so
// HomeHeader can be reused as-is, same pattern as my-pokemon-view.service.ts.
export async function getPokemonCenterViewData(userId: string): Promise<PokemonCenterViewData> {
  const profile = await getPlayerProfile(userId);
  const party = await getPlayerParty(profile.id);

  return {
    displayName: profile.displayName,
    trainerId: formatTrainerId(profile.id),
    level: profile.level,
    xp: getTrainerProgress(profile.level, profile.experience),
    coins: profile.coins,
    gems: profile.gems,
    party,
  };
}
