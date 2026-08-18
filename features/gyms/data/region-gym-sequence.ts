import type { RegionId } from "@/shared/types/region";

// GYMS & LEAGUES PHASE 4 — the ONE ordered list every Gym-region-sequence
// check derives from (section 2 of this Phase's spec). Deliberately
// separate from shared/types/region.ts's own internal ALL_REGION_IDS (not
// exported, and about a different concern — valid RegionId membership, not
// Gym unlock order) and from features/regions/data/region-registry.ts's
// REGION_REGISTRY (World/Map display order, which this Phase's own spec
// requires stay completely unaffected by Gym progression — section 23).
// This file's order is the only thing a Gym region-sequence check may read;
// no other file should hardcode/repeat this list or scatter its own
// previousRegionId conditionals.
export const REGION_GYM_SEQUENCE: readonly RegionId[] = [
  "kanto",
  "johto",
  "hoenn",
  "sinnoh",
  "unova",
  "kalos",
  "alola",
  "galar",
  "paldea",
];

// null for Kanto (first in the sequence — gated only by the Level-10 rule,
// never by a previous region). Every other region's entry point (its Gym 1,
// and transitively everything else in that region) requires the PREVIOUS
// region's Regional Champion defeated. Because defeating a Regional
// Champion already requires that region's own Gym 1/2/3 completed — which
// itself already required ITS previous region's champion defeated — a
// single immediately-previous-region check is sufficient; callers must
// never chain through every earlier region by hand (this Phase's own
// spec, section 2).
export function getPreviousRegionInGymSequence(regionId: RegionId): RegionId | null {
  const index = REGION_GYM_SEQUENCE.indexOf(regionId);
  if (index <= 0) return null;
  return REGION_GYM_SEQUENCE[index - 1];
}
