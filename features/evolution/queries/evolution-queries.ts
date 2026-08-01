import "server-only";

import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import type { PendingEvolutionView } from "@/features/evolution/types/evolution.types";
import { prisma } from "@/lib/db/prisma";

// Read-only lookup for "does this player currently have an unresolved
// evolution decision" — the Home-page safety net (features/evolution/
// components/PendingEvolutionGate.tsx, wired in via getHomeViewData) that
// makes a pending evolution survive a refresh or navigation away from the
// battle screen it was created in: the state itself already lives on
// PlayerPokemon (surviving refresh/logout/restart for free, being a plain
// DB column), this is just what makes it resurface in the UI again if the
// player left before deciding. "First" only in the sense of `findFirst` —
// this phase handles one decision at a time per the spec, so there is
// never more than one pending row to choose from in practice, but the
// query itself doesn't assume that.
export async function getFirstPendingEvolutionView(playerId: string): Promise<PendingEvolutionView | null> {
  const pokemon = await prisma.playerPokemon.findFirst({
    where: { playerId, pendingEvolutionSpeciesId: { not: null } },
    orderBy: { createdAt: "asc" },
  });

  if (!pokemon || !pokemon.pendingEvolutionSpeciesId) {
    return null;
  }

  const currentSpecies = getSpeciesById(pokemon.speciesId);
  const evolvedSpecies = getSpeciesById(pokemon.pendingEvolutionSpeciesId);
  if (!currentSpecies || !evolvedSpecies) {
    return null;
  }

  return {
    playerPokemonId: pokemon.id,
    nickname: pokemon.nickname,
    currentSpecies,
    evolvedSpecies,
  };
}
