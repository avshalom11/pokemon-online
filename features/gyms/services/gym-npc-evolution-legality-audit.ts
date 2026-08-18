import { deriveSpeciesWildLevelRange } from "@/engine/evolution-stage-scaling/species-wild-level-range";
import type { WildLevelRange } from "@/engine/player-level-scaling/wild-level-bracket-lookup";
import { deriveGymNpcLevelRange } from "../config/gym-level-scaling-lookup";
import type { GymDifficulty } from "../types/gym.types";

// GYMS & LEAGUES PHASE 2 — EVOLUTION-STAGE LEGALITY AUDIT (approved
// design, section 11). DETECTION ONLY: this module never changes a
// species, never overrides the Gym scaling range, and never picks a level
// on its own behalf — it only answers "does this fixed team member's
// legal level range even overlap the difficulty range it would be fought
// at," and returns a structured conflict when it does not. What to DO
// about a real conflict (change the species, change the difficulty range,
// accept an above-range/below-range level, ...) is explicitly a decision
// for the project owner once this Phase's audit output is reviewed — see
// this Phase's own report for the current conflict count/examples.
//
// `deriveSpeciesWildLevelRange` (engine/evolution-stage-scaling/
// species-wild-level-range.ts) is the SAME canonical evolution-stage
// legality source Field Battle's own wild encounters already use — no
// second/competing legality calculation exists here.
export interface EvolutionLegalityConflict {
  readonly speciesId: string;
  readonly difficulty: GymDifficulty;
  readonly playerLevel: number;
  readonly gymRange: { readonly minLevel: number; readonly maxLevel: number };
  readonly speciesLegalRange: WildLevelRange;
}

// Returns null when the two ranges overlap (a legal level exists — Phase
// 3's resolver may narrow resolveNpcTeamLevels's own range to this
// intersection once that decision is made, but this function itself never
// does that narrowing); returns the conflict details otherwise.
export function checkEvolutionStageLegality(
  speciesId: string,
  playerLevel: number,
  difficulty: GymDifficulty
): EvolutionLegalityConflict | null {
  const gymRange = deriveGymNpcLevelRange(playerLevel, difficulty);
  const speciesLegalRange = deriveSpeciesWildLevelRange(speciesId);

  const overlaps = gymRange.minLevel <= speciesLegalRange.maximumLevel && speciesLegalRange.minimumLevel <= gymRange.maxLevel;
  if (overlaps) return null;

  return { speciesId, difficulty, playerLevel, gymRange, speciesLegalRange };
}
