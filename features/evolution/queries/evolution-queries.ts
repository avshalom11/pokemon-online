import "server-only";

import { getBranchEvolution } from "@/data/pokemon/pokemon-evolutions";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import type { PendingEvolutionBranchView, PendingEvolutionView } from "@/features/evolution/types/evolution.types";
import { prisma } from "@/lib/db/prisma";
import type { PokemonSpecies } from "@/shared/types/pokemon";

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

// Same safety-net role as getFirstPendingEvolutionView above, for a pending
// BRANCH evolution choice instead (Eevee's Espeon/Umbreon fork today — see
// data/pokemon/pokemon-evolutions.ts's BRANCH_EVOLUTIONS). Independent
// query because the two pending states are mutually exclusive per Pokémon
// (see tryCreatePendingEvolution's own doc comment) but not necessarily
// across a player's whole party — getHomeViewData (features/home/services/
// home-data.service.ts) calls both and only ever renders whichever one
// PendingEvolutionGate finds first.
export async function getFirstPendingEvolutionBranchView(playerId: string): Promise<PendingEvolutionBranchView | null> {
  const pokemon = await prisma.playerPokemon.findFirst({
    where: { playerId, pendingEvolutionBranch: true },
    orderBy: { createdAt: "asc" },
  });

  if (!pokemon) {
    return null;
  }

  const currentSpecies = getSpeciesById(pokemon.speciesId);
  const branchEvolution = getBranchEvolution(pokemon.speciesId);
  if (!currentSpecies || !branchEvolution) {
    return null;
  }

  const targets = branchEvolution.targets
    .map((targetSpeciesId) => getSpeciesById(targetSpeciesId))
    .filter((species): species is PokemonSpecies => species !== undefined);

  if (targets.length === 0) {
    return null;
  }

  return {
    playerPokemonId: pokemon.id,
    nickname: pokemon.nickname,
    currentSpecies,
    targets,
  };
}
