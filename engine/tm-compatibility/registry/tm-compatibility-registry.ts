import { ALL_TM_COMPATIBILITY_DEFINITIONS } from "../data/index.ts";
import type { TmCompatibilityEntry } from "../types/tm-compatibility.types.ts";
import { validateTmCompatibilityList } from "../validation/tm-compatibility-validation.ts";

// Builds a lookup map from an already-validated entry list. Exposed
// separately from the module-level singleton below so tests can build a
// registry from fixture data without touching the real generation data
// folders — same pattern engine/moves' buildMoveRegistry and
// engine/learnsets' buildLearnsetRegistry already establish.
export function buildTmCompatibilityRegistry(entries: readonly TmCompatibilityEntry[]): Map<string, ReadonlySet<string>> {
  const registry = new Map<string, ReadonlySet<string>>();

  for (const entry of entries) {
    registry.set(entry.pokemonId, new Set(entry.moveIds));
  }

  return registry;
}

// Single source of truth for TM compatibility data: validated once at
// module load, then looked up from an in-memory map — same convention
// engine/moves' MOVE_REGISTRY and engine/learnsets' LEARNSET_REGISTRY
// already establish. A pokemonId with no entry here (registry.get returns
// undefined) is deny-by-default incompatible with every TM — see
// ../queries/tm-compatibility-queries.ts's canLearnTm, the only place this
// registry should be read from outside this module.
const VALIDATED_ENTRIES = validateTmCompatibilityList(ALL_TM_COMPATIBILITY_DEFINITIONS);
const TM_COMPATIBILITY_REGISTRY = buildTmCompatibilityRegistry(VALIDATED_ENTRIES);

export function getAllTmCompatibilityEntries(): readonly TmCompatibilityEntry[] {
  return VALIDATED_ENTRIES;
}

export function getCompatibleMoveIdsForPokemon(pokemonId: string): ReadonlySet<string> {
  return TM_COMPATIBILITY_REGISTRY.get(pokemonId) ?? new Set();
}

export function hasTmCompatibilityData(pokemonId: string): boolean {
  return TM_COMPATIBILITY_REGISTRY.has(pokemonId);
}
