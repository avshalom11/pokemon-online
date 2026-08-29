import { getAllLevelEvolutionEntries, getLevelEvolution } from "@/data/pokemon/pokemon-evolutions";

// EGG HATCH REBALANCE — resolves which stage of a level-evolution family is
// appropriate for an ALREADY-ROLLED level, the reverse of the old
// species-drives-level relationship (features/eggs/services/
// hatch-level.service.ts used to do exactly that; the level is now
// authoritative, and this module derives the species from it instead).
//
// Reuses the SAME canonical LEVEL_EVOLUTIONS table (data/pokemon/
// pokemon-evolutions.ts) every other evolution-stage utility in this
// project already reads — never a second/duplicated evolution catalog, and
// never a hardcoded per-family table (no "charmander family" special case
// anywhere here). Only plain LEVEL evolutions are ever walked — exactly
// the same scope engine/evolution-stage-scaling/species-wild-level-range.ts
// already established: a species whose only real evolution is Stone/Item/
// Branch/Trade (vulpix, eevee, ...) is invisible to both lookups below,
// which is exactly how "this species never changes stage here" is
// expressed — so a standalone/special species is handled safely with no
// extra branching, and no evolution relationship is ever invented that
// isn't already in the canonical table.
//
// Built once at module load: evolvesToSpeciesId -> its own direct
// predecessor's speciesId. The mirror image of getLevelEvolution's own
// forward lookup, used only to walk BACKWARD to a family's root — never a
// second source of truth for evolution levels themselves (getLevelEvolution
// remains the only place a required level is ever read).
const PREDECESSOR_BY_SPECIES_ID: Map<string, string> = new Map(
  getAllLevelEvolutionEntries().map(({ speciesId, evolution }) => [evolution.evolvesToSpeciesId, speciesId])
);

// Walks backward through PLAIN level-evolution predecessors only, stopping
// at the first species with none — i.e. the base of this level-evolution
// family. A species with no predecessor at all (a true base stage, OR a
// standalone species, OR a species only ever reached via Stone/Item/Branch)
// is its own root, so this never needs a separate "does this species even
// have a family" check.
export function findFamilyRootSpeciesId(speciesId: string): string {
  let current = speciesId;
  let predecessor = PREDECESSOR_BY_SPECIES_ID.get(current);

  while (predecessor !== undefined) {
    current = predecessor;
    predecessor = PREDECESSOR_BY_SPECIES_ID.get(current);
  }

  return current;
}

// Walks FORWARD from a family's root, advancing one plain level evolution
// at a time for as long as the target level already meets that evolution's
// own requiredLevel — the same "reached this stage at exactly its own
// threshold, never a level below it" rule species-wild-level-range.ts's own
// deriveSpeciesWildLevelRange already encodes (minimumLevel there ==
// requiredLevel here). The level is NEVER increased to force a later
// evolution to become valid — a level below the next threshold simply
// leaves the walk at the current (earlier) stage, and a family with no
// further plain level evolution at all (final stage, or a standalone
// species) returns immediately as-is.
function resolveStageForLevelFromRoot(rootSpeciesId: string, level: number): string {
  let current = rootSpeciesId;
  let nextEvolution = getLevelEvolution(current);

  while (nextEvolution !== undefined && level >= nextEvolution.requiredLevel) {
    current = nextEvolution.evolvesToSpeciesId;
    nextEvolution = getLevelEvolution(current);
  }

  return current;
}

// The one function callers need: given ANY species already known to belong
// to a family (e.g. the family "seed" a rarity-pool roll already selected —
// see features/eggs/services/hatch-pool.service.ts's own rollHatchSpecies,
// which may land on any stage since every stage of a family shares the same
// real PokemonSpecies.rarity), returns the stage that's actually correct
// for `level` — independent of which specific stage happened to be drawn.
// A species with no level-evolution family at all (standalone, or one whose
// only real evolution method isn't level-based) is simply returned as-is,
// unaffected by `level`.
export function resolveSpeciesIdForLevel(speciesId: string, level: number): string {
  return resolveStageForLevelFromRoot(findFamilyRootSpeciesId(speciesId), level);
}
