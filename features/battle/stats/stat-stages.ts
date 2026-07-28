import type { PokemonStats } from "@/engine/battle/pokemon-stat-calculations";
import type { StatName } from "@/engine/moves";

// Phase 6E — battle-local stat stages (-6..+6). Never touches
// PlayerPokemon/species base stats — purely in-memory/per-battle, reset on
// switch and on a new encounter (see battle-action.service.ts and
// battle-session.service.ts). Accuracy/evasion only ever exist as stages
// (no base value), so they live in this same map even though they aren't
// part of PokemonStats.

export const MIN_STAT_STAGE = -6;
export const MAX_STAT_STAGE = 6;

export type StatStages = Partial<Record<StatName, number>>;

export function getStatStage(stages: StatStages, stat: StatName): number {
  return stages[stat] ?? 0;
}

export function clampStatStage(stage: number): number {
  return Math.max(MIN_STAT_STAGE, Math.min(MAX_STAT_STAGE, stage));
}

// Canonical stage multiplier for Attack/Defense/Special Attack/Special
// Defense/Speed: stage >= 0 -> (2+stage)/2, stage < 0 -> 2/(2-stage).
// +1 = 1.5, +2 = 2, -1 = 2/3, -2 = 0.5.
export function getStatStageMultiplier(stage: number): number {
  const clamped = clampStatStage(stage);
  return clamped >= 0 ? (2 + clamped) / 2 : 2 / (2 - clamped);
}

// Accuracy/Evasion use the same canonical shape with a denominator of 3
// instead of 2 — the standard Pokémon accuracy-stage table.
export function getAccuracyStageMultiplier(stage: number): number {
  const clamped = clampStatStage(stage);
  return clamped >= 0 ? (3 + clamped) / 3 : 3 / (3 - clamped);
}

// Scales an already-computed PokemonStats (calculatePokemonStats) by
// Attack/Defense/SpecialAttack/SpecialDefense/Speed stages — never
// recomputes the base formula itself. Accuracy/evasion are handled
// separately (they're not fields on PokemonStats).
export function applyStatStagesToStats(stats: PokemonStats, stages: StatStages | undefined): PokemonStats {
  if (!stages) return stats;

  return {
    maxHp: stats.maxHp,
    attack: Math.floor(stats.attack * getStatStageMultiplier(getStatStage(stages, "attack"))),
    defense: Math.floor(stats.defense * getStatStageMultiplier(getStatStage(stages, "defense"))),
    specialAttack: Math.floor(stats.specialAttack * getStatStageMultiplier(getStatStage(stages, "specialAttack"))),
    specialDefense: Math.floor(stats.specialDefense * getStatStageMultiplier(getStatStage(stages, "specialDefense"))),
    speed: Math.floor(stats.speed * getStatStageMultiplier(getStatStage(stages, "speed"))),
  };
}

export interface StatStageChangeResult {
  stages: StatStages;
  previousStage: number;
  newStage: number;
  // true when the attempted change was fully absorbed by the -6/+6 clamp
  // (no actual movement) — the caller must report this rather than
  // silently pretending the stat changed (Phase 6E's own rule).
  limited: boolean;
}

export function changeStatStage(stages: StatStages, stat: StatName, delta: number): StatStageChangeResult {
  const previousStage = getStatStage(stages, stat);
  const newStage = clampStatStage(previousStage + delta);

  return {
    stages: { ...stages, [stat]: newStage },
    previousStage,
    newStage,
    limited: newStage === previousStage,
  };
}
