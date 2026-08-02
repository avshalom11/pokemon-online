import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { getAllStoneEvolutionEntries } from "@/data/pokemon/pokemon-evolutions";
import type { PokemonRarity } from "@/shared/types/pokemon";

// Phase 3 — Stone-evolved wild Pokémon use Very-Rare encounter odds without
// Very-Rare UI styling. This module is ENCOUNTER-ONLY: it computes which
// rarity TIER a species' wild encounter probability should be bucketed
// into, entirely separate from PokemonSpecies.rarity (which stays the
// single source of truth for battle UI — background, warning banner, the
// rarity label — and capture odds; see capture.service.ts's own
// species.rarity read and BattleContent.tsx's own wildState.pokemon.rarity
// reads, neither of which this module is ever wired into). No Prisma, no
// React, no UI strings, no randomness — a pure lookup, exactly like
// engine/evolution-stage-scaling's own species-wild-level-range.ts.

// Built once at module load: every species id that is the TARGET of at
// least one stone evolution (data/pokemon/pokemon-evolutions.ts's own
// STONE_EVOLUTIONS table, read via getAllStoneEvolutionEntries) — never a
// second/duplicated species list. A Set, not a Map: only membership
// matters here, never which stone or which pre-evolution led to it.
const STONE_EVOLVED_SPECIES_IDS: ReadonlySet<string> = new Set(
  getAllStoneEvolutionEntries().map((entry) => entry.evolution.evolvesToSpeciesId)
);

// pokemonId -> real catalog rarity, built once at module load — the same
// "build once, O(1) lookups after" precedent
// pokemon-encounter-engine.ts's own SPECIES_RARITY_BY_ID used before this
// module existed (that local map is now replaced by this one, so the
// lookup lives in exactly one place).
const SPECIES_RARITY_BY_ID: Map<string, PokemonRarity> = new Map(
  POKEMON_DATA.map((species) => [species.id, species.rarity])
);

// The one place a species' wild-encounter rarity TIER is ever computed.
// Returns undefined for a speciesId that doesn't resolve in the catalog at
// all — the exact same defensive "unknown -> skip" contract
// pokemon-encounter-engine.ts's groupByRarity already relies on, so an
// invalid/missing id is never silently assigned an invented rarity.
//
// - A species that is the target of a stone evolution (Ninetales,
//   Arcanine, Raichu, Vaporeon, Jolteon, Flareon, Poliwrath, Cloyster,
//   Starmie, Vileplume, Victreebel, Exeggutor today — derived, never
//   hardcoded here) always resolves to "very-rare" for THIS purpose,
//   regardless of its own real PokemonSpecies.rarity.
// - Every other species resolves to its own real catalog rarity, unchanged.
export function getEffectiveEncounterRarity(speciesId: string): PokemonRarity | undefined {
  const catalogRarity = SPECIES_RARITY_BY_ID.get(speciesId);

  if (!catalogRarity) {
    return undefined;
  }

  return STONE_EVOLVED_SPECIES_IDS.has(speciesId) ? "very-rare" : catalogRarity;
}
