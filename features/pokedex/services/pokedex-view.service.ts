import "server-only";

import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { prisma } from "@/lib/db/prisma";
import type { PokedexEntryView } from "../types/pokedex.types";

// Every species in Pokédex order — computed once at module load (POKEMON_DATA
// never changes at runtime), never re-sorted per request. The catalog itself
// is NOT stored in dexNumber order (see data/pokemon/pokemon-data.ts), so
// this is the one place that ordering is ever produced; every other reader
// of POKEMON_DATA is unaffected.
const SPECIES_IN_DEX_ORDER = [...POKEMON_DATA].sort((a, b) => a.dexNumber - b.dexNumber);

// The Pokédex page's one data source — exactly two lightweight queries
// (never one per species, never one round trip per catalog entry) combined
// against the static catalog:
//   - PlayerSeenSpecies: every species this player has ever encountered in
//     a field battle (features/pokedex/services/mark-species-seen.service.ts).
//   - PlayerPokemon, distinct by speciesId: every species this player
//     currently owns at least one instance of — party AND storage, no
//     partySlot filter of any kind, so a boxed/stored Pokémon counts
//     exactly the same as a party member.
// "Caught" always wins over "seen" (an owned Pokémon was necessarily
// obtained somehow, even if that was never a field-battle encounter — e.g.
// a starter) — see PokedexStatus's own doc comment.
//
// Shared by getPokedexView (below) and getPokedexCounts (features/profile's
// own public-stats reuse of this exact same business rule) — the only two
// consumers of "which species are seen/owned", so the two queries and the
// Set-building are never duplicated between them.
async function getSeenAndOwnedSpeciesIds(playerId: string): Promise<{ seenSpeciesIds: Set<string>; ownedSpeciesIds: Set<string> }> {
  const [seenRows, ownedRows] = await Promise.all([
    prisma.playerSeenSpecies.findMany({ where: { playerId }, select: { speciesId: true } }),
    prisma.playerPokemon.findMany({ where: { playerId }, select: { speciesId: true } }),
  ]);

  return {
    seenSpeciesIds: new Set(seenRows.map((row) => row.speciesId)),
    ownedSpeciesIds: new Set(ownedRows.map((row) => row.speciesId)),
  };
}

export async function getPokedexView(playerId: string): Promise<PokedexEntryView[]> {
  const { seenSpeciesIds, ownedSpeciesIds } = await getSeenAndOwnedSpeciesIds(playerId);

  return SPECIES_IN_DEX_ORDER.map((species) => ({
    species,
    status: ownedSpeciesIds.has(species.id) ? "caught" : seenSpeciesIds.has(species.id) ? "seen" : "unseen",
  }));
}

export interface PokedexCounts {
  // Every distinct species either encountered in a field battle OR owned —
  // matches the Pokédex page's own "Seen" stat pill exactly (status !==
  // "unseen"), so a player never sees two different "seen" numbers on two
  // different pages.
  seenCount: number;
  // Distinct species owned — the same count as getOwnedPokemonStats's own
  // uniqueSpeciesCaught (features/pokemon/services/player-pokemon.ts),
  // exposed here too so a caller that only needs Pokédex-shaped counts
  // (features/profile) doesn't need to know that overlap exists.
  caughtCount: number;
}

// A lightweight counts-only alternative to getPokedexView — never fetches
// or builds every species object, just the two counts features/profile's
// public statistics section needs. Reuses the exact same query/Set logic
// getPokedexView itself uses, so the two can never drift apart on what
// counts as "seen".
export async function getPokedexCounts(playerId: string): Promise<PokedexCounts> {
  const { seenSpeciesIds, ownedSpeciesIds } = await getSeenAndOwnedSpeciesIds(playerId);
  const seenOrOwned = new Set([...seenSpeciesIds, ...ownedSpeciesIds]);

  return { seenCount: seenOrOwned.size, caughtCount: ownedSpeciesIds.size };
}
