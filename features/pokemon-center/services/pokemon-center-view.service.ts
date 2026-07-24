import "server-only";

import { getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

export interface PokemonCenterViewData {
  party: OwnedPokemon[];
}

// Aggregator for app/(game)/pokemon-center/page.tsx, same role as
// home-data.service.ts / my-pokemon-view.service.ts — keeps the page a thin
// display layer. Only the active party is fetched (not the full collection):
// healing only ever applies to active-party members, so nothing else is
// needed here. Profile-level display fields (displayName, level, xp, coins,
// gold) live in features/player/services/player-header-data.service.ts
// instead — the global header (app/(game)/layout.tsx) is the only thing
// that needs them.
export async function getPokemonCenterViewData(userId: string): Promise<PokemonCenterViewData> {
  const profile = await getPlayerProfile(userId);
  const party = await getPlayerParty(profile.id);

  return { party };
}
