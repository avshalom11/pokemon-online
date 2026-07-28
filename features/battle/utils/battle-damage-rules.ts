import { calculatePokemonStats } from "@/engine/battle/pokemon-stat-calculations";
import { calculateMoveDamage, type CalculateMoveDamageResult } from "@/engine/damage";
import type { Move } from "@/engine/moves";
import type { PokemonBaseStats, PokemonType } from "@/shared/types/pokemon";

import type { MajorStatus } from "@/features/battle/status/major-status";
import { applyStatStagesToStats, clampStatStage, getAccuracyStageMultiplier, getStatStage, type StatStages } from "@/features/battle/stats/stat-stages";

// Phase 6E/6G: burn halves the burned Pokémon's *effective* Attack for
// physical moves only (never Special Attack) — the modern-generation rule
// this project already favors elsewhere (STAB, Type Chart), applied here
// as a multiplier on top of stat stages rather than a second damage
// formula.
const BURN_ATTACK_MULTIPLIER = 0.5;

export interface DamageBattler {
  baseStats: PokemonBaseStats;
  level: number;
  types: readonly PokemonType[];
  // Phase 6E — battle-local stat stages (accuracy/evasion included, even
  // though they're not part of PokemonStats). Omitted entirely means "no
  // stages" (every stat at 1x), so every pre-Phase-6E caller keeps
  // compiling and behaving exactly as before.
  stages?: StatStages;
  // Phase 6G — only "burn" has any effect on damage calculation (halving
  // the attacker's own effective Attack for physical moves); every other
  // status is irrelevant to this pipeline and is simply ignored here.
  status?: MajorStatus | null;
}

// Prefer passing already-resolved effective stats into the existing
// Damage Engine (calculateMoveDamage) rather than teaching that pure
// engine to read battle state itself — this function is exactly the
// "glue" layer Phase 5B.2 already established for that purpose; extending
// it here (stat stages, burn) is not a second damage formula, just more
// inputs composed before the one call into calculateMoveDamage.
export function resolveAttackDamage(
  move: Move,
  attacker: DamageBattler,
  defender: DamageBattler,
  randomFactor: number,
  accuracyRoll?: number,
  criticalRoll?: number,
  // Phase 6-cleanup — true only for a multi-hit move's second-and-later
  // hits, whose accuracy was already confirmed once for the whole move;
  // skips the accuracy check entirely rather than passing a synthetic
  // guaranteed-hit accuracyRoll. See damage-types.ts's own doc comment.
  accuracyAlreadyConfirmed?: boolean
): CalculateMoveDamageResult {
  const attackerStats = applyStatStagesToStats(
    calculatePokemonStats({ baseStats: attacker.baseStats, level: attacker.level }),
    attacker.stages
  );
  const defenderStats = applyStatStagesToStats(
    calculatePokemonStats({ baseStats: defender.baseStats, level: defender.level }),
    defender.stages
  );

  if (attacker.status === "burn" && move.category === "physical") {
    attackerStats.attack = Math.max(1, Math.floor(attackerStats.attack * BURN_ATTACK_MULTIPLIER));
  }

  // Phase 6E — Accuracy/Evasion stages combine into a single stage
  // (attacker's accuracy stage minus defender's evasion stage, clamped to
  // -6..+6 — the standard Pokémon rule) before one multiplier lookup,
  // rather than two separate multipliers stacking independently.
  // Clamped/rounded to an integer in [0, 100] before reaching
  // calculateMoveDamage, which validates and throws on anything outside
  // that range or non-integer — it never clamps for you.
  const combinedAccuracyStage = clampStatStage(
    getStatStage(attacker.stages ?? {}, "accuracy") - getStatStage(defender.stages ?? {}, "evasion")
  );
  const effectiveAccuracy =
    move.accuracy === null || move.accuracy === undefined
      ? move.accuracy
      : Math.max(0, Math.min(100, Math.round(move.accuracy * getAccuracyStageMultiplier(combinedAccuracyStage))));

  return calculateMoveDamage({
    level: attacker.level,
    moveCategory: move.category,
    movePower: move.power,
    moveType: move.type,
    attackerTypes: attacker.types,
    defenderTypes: defender.types,
    attackerStats,
    defenderStats,
    randomFactor,
    accuracy: effectiveAccuracy,
    accuracyRoll,
    criticalRoll,
    accuracyAlreadyConfirmed,
  });
}
