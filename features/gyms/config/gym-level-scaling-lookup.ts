import { GYM_DIFFICULTY_LEVEL_OFFSETS } from "./gym-level-scaling.config";
import type { GymDifficulty } from "../types/gym.types";

export interface GymNpcLevelRange {
  readonly minLevel: number;
  readonly maxLevel: number;
}

// Never below 1, and never a fractional/NaN player level reaching the
// offset lookup below — same defensive-clamp precedent
// wild-level-bracket-lookup.ts's own safePlayerLevel already establishes.
function safePlayerLevel(playerLevel: number): number {
  if (!Number.isFinite(playerLevel)) return 1;
  return Math.max(1, Math.floor(playerLevel));
}

// The one function that turns (playerLevel, difficulty) into a legal NPC
// level range for a Gym/Regional Champion battle — the reusable primitive
// section 9 asks for so Phase 2's NPC team generation has one source of
// truth, never a second copy of these offsets. Clamped so the minimum
// resulting level is always 1 (a low-level player's "easy" offset of -4
// must never go negative or to 0) — the max is intentionally left
// unclamped upward, since there is no upper Pokémon level ceiling issue
// symmetrical to the lower one here (MAX_POKEMON_LEVEL enforcement, if
// ever needed, belongs to Phase 2's actual roster generation, not this
// pure range derivation).
export function deriveGymNpcLevelRange(playerLevel: number, difficulty: GymDifficulty): GymNpcLevelRange {
  const level = safePlayerLevel(playerLevel);
  // GYM_DIFFICULTY_LEVEL_OFFSETS always has exactly one entry per
  // GymDifficulty (see that file's own doc comment) — the `!` reflects
  // that invariant, not an assumption about the input.
  const offset = GYM_DIFFICULTY_LEVEL_OFFSETS.find((candidate) => candidate.difficulty === difficulty)!;

  return {
    minLevel: Math.max(1, level + offset.minOffset),
    maxLevel: Math.max(1, level + offset.maxOffset),
  };
}
