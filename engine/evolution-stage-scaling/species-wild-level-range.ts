import { getAllLevelEvolutionEntries, getLevelEvolution } from "@/data/pokemon/pokemon-evolutions";
import type { WildLevelRange } from "@/engine/player-level-scaling/wild-level-bracket-lookup";

// Phase 2 — Evolution-stage-aware wild encounters. Reverse index built once
// at module load: evolvesToSpeciesId -> the level required to have reached
// it. The mirror image of getLevelEvolution's own forward lookup
// (speciesId -> {evolvesToSpeciesId, requiredLevel}) — this is the one
// place that same canonical table (data/pokemon/pokemon-evolutions.ts,
// never a second catalog) is ever read backwards.
const REQUIRED_LEVEL_TO_HAVE_BECOME: Map<string, number> = new Map(
  getAllLevelEvolutionEntries().map(({ evolution }) => [evolution.evolvesToSpeciesId, evolution.requiredLevel])
);

// The legal wild-level range for one species — derived purely from the
// canonical LEVEL-EVOLUTION data, never inferred from dex number, name, or
// a second catalog. This phase's scope is level-based chains only: a
// species whose only canonical evolution is Stone/Trade/Friendship (e.g.
// vulpix, pikachu, eevee) is invisible to both lookups below, exactly like
// a species with no evolution relationship at all — both end up fully
// unrestricted, the same safe default an unknown/invalid speciesId also
// falls into (neither lookup ever matches a string that isn't a real
// pre-evolution or evolution-target key), so this never needs a separate
// existence check to stay defensive.
//
// - minimumLevel: the level required to have BECOME this species (only set
//   for a species that is itself some other species' evolvesToSpeciesId —
//   i.e. a middle or final evolution). 1 for a base form or an unrestricted
//   species.
// - maximumLevel: evolutionLevel - 1 when this species itself evolves by
//   level into something else (a base or middle form). Number.POSITIVE_INFINITY
//   — open-ended, never a hardcoded cap — for a final evolution or an
//   unrestricted species.
export function deriveSpeciesWildLevelRange(speciesId: string): WildLevelRange {
  const ownEvolution = getLevelEvolution(speciesId);
  const requiredLevelToHaveBecomeThis = REQUIRED_LEVEL_TO_HAVE_BECOME.get(speciesId);

  return {
    minimumLevel: requiredLevelToHaveBecomeThis ?? 1,
    maximumLevel: ownEvolution ? ownEvolution.requiredLevel - 1 : Number.POSITIVE_INFINITY,
  };
}
