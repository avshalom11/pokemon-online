import "server-only";

import { getTrainerProgress, type TrainerProgress } from "@/engine/player/trainer-progress";
import { formatTrainerId } from "@/features/home/services/trainer-id";
import { getAllOwnedPokemon, getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

export interface MyPokemonViewData {
  displayName: string;
  trainerId: string;

  level: number;
  xp: TrainerProgress;

  coins: number;
  gems: number;

  party: OwnedPokemon[];
  collection: OwnedPokemon[];
}

// Aggregator for app/my-pokemon/page.tsx, mirroring home-data.service.ts's
// role for Home — keeps the page itself a thin display layer. Reuses the
// exact same profile fields Home assembles (so HomeHeader, reused as-is on
// this page, gets the shape it expects) plus the collection-specific data.
//
// totalCaught for the page's stats row is simply collection.length — no
// extra count query needed since the full collection is already fetched
// here for the grid.
export async function getMyPokemonViewData(userId: string): Promise<MyPokemonViewData> {
  const profile = await getPlayerProfile(userId);
  const [party, collection] = await Promise.all([
    getPlayerParty(profile.id),
    getAllOwnedPokemon(profile.id),
  ]);

  return {
    displayName: profile.displayName,
    trainerId: formatTrainerId(profile.id),
    level: profile.level,
    xp: getTrainerProgress(profile.level, profile.experience),
    coins: profile.coins,
    gems: profile.gems,
    party,
    collection,
  };
}
