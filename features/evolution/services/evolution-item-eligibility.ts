import { getEvolutionItemEvolutionByItem } from "@/data/pokemon/pokemon-evolutions";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { PokemonSpecies } from "@/shared/types/pokemon";

// Pure, framework-free evolution-item eligibility filter — no React, no
// Prisma, no "server-only" (same split as pokemon-progression-calculations.ts
// between pure formulas and a server-only service). Deliberately callable
// client-side: InventoryContent already has the player's full owned-Pokémon
// list in props (features/pokemon/services/player-pokemon.ts's
// getAllOwnedPokemon, covering party AND storage), so filtering "which of
// these can evolve with this exact item" needs no extra round trip.
//
// Independent of pendingEvolutionSpeciesId/pendingEvolutionBranch/
// evolutionPermanentlyBlocked by construction: those fields are never read
// here at all. A species with an evolution-item evolution is, by
// data/pokemon/pokemon-evolutions.ts's own design, never also present in
// the Level Evolution table, so an item-eligible Pokémon can never have a
// pending level/branch decision to begin with — see that file's own doc
// comment.
export interface EvolutionItemCandidate {
  playerPokemonId: string;
  nickname: string | null;
  level: number;
  currentSpecies: PokemonSpecies;
  evolvedSpecies: PokemonSpecies;
}

export function getEvolutionItemCandidates(itemId: string, ownedPokemon: OwnedPokemon[]): EvolutionItemCandidate[] {
  const candidates: EvolutionItemCandidate[] = [];

  for (const pokemon of ownedPokemon) {
    const evolution = getEvolutionItemEvolutionByItem(pokemon.species.id, itemId);
    if (!evolution) continue;

    const evolvedSpecies = getSpeciesById(evolution.evolvesToSpeciesId);
    if (!evolvedSpecies) continue;

    candidates.push({
      playerPokemonId: pokemon.id,
      nickname: pokemon.nickname ?? null,
      level: pokemon.level,
      currentSpecies: pokemon.species,
      evolvedSpecies,
    });
  }

  return candidates;
}
