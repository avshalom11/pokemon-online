import { intersectLevelRanges } from "./level-range-intersection";
import { deriveSpeciesWildLevelRange } from "./species-wild-level-range";
import type { WildLevelRange } from "@/engine/player-level-scaling/wild-level-bracket-lookup";

// The one overlap the encounter engine ever needs: one species' own legal
// evolution-stage range (species-wild-level-range.ts) intersected with the
// player's current wild-level bracket (engine/player-level-scaling). A
// non-null result IS both eligibility (Stage 2's filter, below) AND the
// exact narrower range the final wild level must be rolled from once this
// species is actually selected — computed once here, so the two can never
// drift apart or disagree.
export function getEligibleWildLevelRange(speciesId: string, playerRange: WildLevelRange): WildLevelRange | null {
  return intersectLevelRanges(deriveSpeciesWildLevelRange(speciesId), playerRange);
}

export function isSpeciesEligibleForWildRange(speciesId: string, playerRange: WildLevelRange): boolean {
  return getEligibleWildLevelRange(speciesId, playerRange) !== null;
}
