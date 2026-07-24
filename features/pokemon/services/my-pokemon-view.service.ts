import "server-only";

import { getAllOwnedPokemon, getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

export interface MyPokemonViewData {
  // Kept (unlike trainerId/level/xp/coins/gold, which the now-shared global
  // header owns instead — see features/player/services/player-header-data.service.ts):
  // MyPokemonContent passes this to PokemonDetailsPanel's trainerName prop,
  // a genuine use independent of any header.
  displayName: string;

  party: OwnedPokemon[];
  collection: OwnedPokemon[];
}

// Aggregator for app/(game)/my-pokemon/page.tsx, mirroring
// home-data.service.ts's role for Home — keeps the page itself a thin
// display layer.
export async function getMyPokemonViewData(userId: string): Promise<MyPokemonViewData> {
  const profile = await getPlayerProfile(userId);
  const [party, collection] = await Promise.all([
    getPlayerParty(profile.id),
    getAllOwnedPokemon(profile.id),
  ]);

  return {
    displayName: profile.displayName,
    party,
    collection,
  };
}
