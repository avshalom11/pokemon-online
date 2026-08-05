import "server-only";

import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { getFormEntries, getFormLabel, isAlternateForm } from "@/features/pokemon/forms/pokemon-forms";
import { prisma } from "@/lib/db/prisma";
import type { PokedexEntryView, PokedexFormView, PokedexStatus } from "../types/pokedex.types";

// Every HEADLINE species (i.e. excluding alternate forms — see
// features/pokemon/forms's own doc comment) in Pokédex order, computed once
// at module load (POKEMON_DATA never changes at runtime), never re-sorted
// per request. This is what keeps the Pokédex "one row per National Dex
// number" even once a species has multiple forms: an alternate form shares
// its base's dexNumber and is folded into that base's own `forms` array
// (see getPokedexView below) instead of ever becoming its own row here. The
// catalog itself is NOT stored in dexNumber order (see
// data/pokemon/pokemon-data.ts), so this is the one place that ordering is
// ever produced; every other reader of POKEMON_DATA is unaffected.
const SPECIES_IN_DEX_ORDER = [...POKEMON_DATA].filter((species) => !isAlternateForm(species)).sort((a, b) => a.dexNumber - b.dexNumber);

// Best-of ranking for combining every form's own status into one entry-level
// status — an entry is "caught" the moment ANY of its forms is caught, and
// "seen" the moment any form has been seen, exactly like a real Pokédex
// unlocks on first contact regardless of which form you meet first.
const STATUS_RANK: Record<PokedexStatus, number> = { unseen: 0, seen: 1, caught: 2 };

function betterStatus(a: PokedexStatus, b: PokedexStatus): PokedexStatus {
  return STATUS_RANK[b] > STATUS_RANK[a] ? b : a;
}

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

function statusFor(speciesId: string, seenSpeciesIds: Set<string>, ownedSpeciesIds: Set<string>): PokedexStatus {
  return ownedSpeciesIds.has(speciesId) ? "caught" : seenSpeciesIds.has(speciesId) ? "seen" : "unseen";
}

export async function getPokedexView(playerId: string): Promise<PokedexEntryView[]> {
  const { seenSpeciesIds, ownedSpeciesIds } = await getSeenAndOwnedSpeciesIds(playerId);

  return SPECIES_IN_DEX_ORDER.map((species) => {
    const forms: PokedexFormView[] = getFormEntries(species).map((formSpecies) => ({
      species: formSpecies,
      label: getFormLabel(formSpecies),
      status: statusFor(formSpecies.id, seenSpeciesIds, ownedSpeciesIds),
    }));

    const status = forms.reduce<PokedexStatus>((best, form) => betterStatus(best, form.status), "unseen");

    return { species, status, forms };
  });
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

// A lightweight counts-only alternative to getPokedexView — never fetches or
// builds every species object, just the two counts features/profile's
// public statistics section needs. Reuses the exact same query/Set logic
// getPokedexView itself uses, so the two can never drift apart on what
// counts as "seen". Counted per Dex ENTRY (headline species), not per raw
// speciesId — so catching e.g. both Deoxys Attack and Defense Form still
// counts as 1 toward caughtCount, matching the Pokédex grid's own "one row
// per National Dex number" rule exactly (see SPECIES_IN_DEX_ORDER above).
export async function getPokedexCounts(playerId: string): Promise<PokedexCounts> {
  const { seenSpeciesIds, ownedSpeciesIds } = await getSeenAndOwnedSpeciesIds(playerId);

  let seenCount = 0;
  let caughtCount = 0;

  for (const species of SPECIES_IN_DEX_ORDER) {
    const formIds = getFormEntries(species).map((form) => form.id);
    if (formIds.some((id) => ownedSpeciesIds.has(id))) caughtCount++;
    if (formIds.some((id) => ownedSpeciesIds.has(id) || seenSpeciesIds.has(id))) seenCount++;
  }

  return { seenCount, caughtCount };
}
