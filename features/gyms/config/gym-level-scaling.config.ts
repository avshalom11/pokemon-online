import type { GymDifficulty } from "../types/gym.types";

// GYMS & LEAGUES PHASE 1 — the ONLY place player-level -> Gym/Regional
// Champion NPC-level offsets are defined. Deliberately independent from
// engine/player-level-scaling/wild-level-brackets.config.ts (Field Battle's
// own wild-encounter scaling) — Gym/League NPC teams are a fully separate
// system with their own difficulty curve, never derived from or mixed with
// wild encounter brackets. NPC team generation itself is Phase 2; this
// config only defines the legal level RANGE a future NPC roster must be
// generated within.
export interface GymDifficultyLevelOffset {
  readonly difficulty: GymDifficulty;
  // Both relative to the player's own level — e.g. easy's -4..-1 means an
  // NPC roster generated 4 to 1 levels below the player.
  readonly minOffset: number;
  readonly maxOffset: number;
}

// Approved offsets (section 9):
//   Easy Trainer:        player level -4 to -1
//   Medium Trainer:       player level -1 to +2
//   Gym Leader:           player level +2 to +5
//   Regional Champion:    player level +5 to +8
export const GYM_DIFFICULTY_LEVEL_OFFSETS: readonly GymDifficultyLevelOffset[] = [
  { difficulty: "easy", minOffset: -4, maxOffset: -1 },
  { difficulty: "medium", minOffset: -1, maxOffset: 2 },
  { difficulty: "hard", minOffset: 2, maxOffset: 5 },
  { difficulty: "very-hard", minOffset: 5, maxOffset: 8 },
];
