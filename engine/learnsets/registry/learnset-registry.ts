import { ALL_LEARNSET_DEFINITIONS } from "../data/index.ts";
import type { PokemonLearnset, PokemonLearnsetId } from "../types/learnset.types.ts";
import { validateLearnsetList } from "../validation/learnset-validation.ts";

// Builds a lookup map from an already-validated learnset list. Exposed
// separately from the module-level singleton below so tests can build a
// registry from fixture data without touching the real generation data
// folders. A species has at most one learnset in the registry — see the
// duplicate-pokemonId check in validateLearnsetList.
export function buildLearnsetRegistry(
  learnsets: readonly PokemonLearnset[]
): Map<PokemonLearnsetId, PokemonLearnset> {
  const registry = new Map<PokemonLearnsetId, PokemonLearnset>();

  for (const learnset of learnsets) {
    registry.set(learnset.pokemonId, learnset);
  }

  return registry;
}

// Single source of truth for learnset data: validated once at module load,
// then looked up from an in-memory map. Every consumer (onboarding, wild
// Pokémon creation, level-up processing, move-learning UI, battle prep,
// tests) goes through the helpers below instead of importing generation
// data folders directly.
const VALIDATED_LEARNSETS = validateLearnsetList(ALL_LEARNSET_DEFINITIONS);
const LEARNSET_REGISTRY = buildLearnsetRegistry(VALIDATED_LEARNSETS);

export function getAllLearnsets(): readonly PokemonLearnset[] {
  return VALIDATED_LEARNSETS;
}

export function getLearnsetByPokemonId(pokemonId: PokemonLearnsetId): PokemonLearnset | undefined {
  return LEARNSET_REGISTRY.get(pokemonId);
}

export function hasLearnset(pokemonId: PokemonLearnsetId): boolean {
  return LEARNSET_REGISTRY.has(pokemonId);
}
