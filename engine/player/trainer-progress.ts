// Trainer-level progression curve — distinct from Pokémon leveling
// (engine/battle/stat-calculation.ts). No formula existed yet for this, so
// this is a deliberately simple MVP curve (linear, 100 XP/level); tune here
// only, every consumer (currently just the home XP bar) reads through it
// rather than hardcoding the curve.
export function getExperienceForNextLevel(level: number): number {
  return level * 100;
}

export interface TrainerProgress {
  current: number;
  max: number;
}

export function getTrainerProgress(level: number, experience: number): TrainerProgress {
  return {
    current: experience,
    max: getExperienceForNextLevel(level),
  };
}
