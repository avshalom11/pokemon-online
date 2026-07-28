// Public entry point for the pure damage calculation engine (Phase 5B.1:
// base formula + random factor; Phase 5B.2: wired into live battles;
// Phase 5C: STAB; Phase 5D: Type Effectiveness; Phase 5E: Accuracy/Miss;
// Phase 5F: Critical Hits; Phase 5G: Battle Outcome metadata; Phase 5H:
// Enemy Known Moves & Random Move Selection).
//
// Wired into live battles since Phase 5B.2 — the player's own attack goes
// through calculateMoveDamage (features/battle/utils/battle-damage-rules.ts's
// resolveAttackDamage, called from battle-action.service.ts). As of Phase
// 5H, the wild's own attack goes through the exact same
// calculateMoveDamage/resolveAttackDamage pipeline too — it picks one of
// its own Known Moves uniformly at random (features/battle/ai/
// select-enemy-move.ts) instead of the old fixed applyFixedAttack
// (engine/battle/battle-config.ts), which remains only for the unrelated
// switch-in/failed-capture counter-hit (battle-turn-rules.ts).
//
// Deliberately independent of the pre-existing, disconnected engine that
// predates the current Move Registry — engine/battle/battle-engine.ts,
// engine/battle/damage-calculation.ts, engine/battle/battle-ai.ts,
// engine/battle/accuracy.ts, engine/battle/turn-order.ts,
// engine/battle/type-effectiveness.ts, data/battle/type-chart.ts, and
// data/moves/move-data.ts. None of those files are imported here or
// modified by this phase — type-chart.ts below is a brand new, independent
// canonical Type Chart, not a reuse of the old data/battle/type-chart.ts.

export type {
  BattleEffectiveness,
  CalculateMoveDamageInput,
  CalculateMoveDamageResult,
  DamageDefensiveStats,
  DamageOffensiveStats,
  DamagingMoveCategory,
  DamagingMoveResult,
  DefensiveStatKind,
  MissedMoveResult,
  NonDamagingMoveResult,
  NonDamagingReason,
  OffensiveStatKind,
} from "./damage-types.ts";

export {
  MAX_DAMAGE_RANDOM_FACTOR,
  MIN_DAMAGE_RANDOM_FACTOR,
  STAB_MULTIPLIER,
  DamageValidationError,
  calculateBaseDamage,
  calculateMoveDamage,
} from "./damage-calculation.ts";

export { rollDamageRandomFactor, rollAccuracyCheck, rollCriticalHit } from "./random.ts";

// Phase 5E — the accuracy/miss gate. checkMoveAccuracy is exposed for
// direct unit testing; every real damage calculation goes through it
// internally via calculateMoveDamage above, never by calling it separately.
export type { AccuracyCheckResult } from "./accuracy.ts";
export { MAX_ACCURACY, MAX_ACCURACY_ROLL, MIN_ACCURACY, MIN_ACCURACY_ROLL, checkMoveAccuracy } from "./accuracy.ts";

// Phase 5F — the critical-hit gate. checkCriticalHit is exposed for direct
// unit testing; every real damage calculation goes through it internally
// via calculateMoveDamage above, never by calling it separately.
export type { CriticalHitCheckResult } from "./critical.ts";
export {
  CRITICAL_HIT_CHANCE,
  CRITICAL_HIT_MULTIPLIER,
  MAX_CRITICAL_ROLL,
  MIN_CRITICAL_ROLL,
  checkCriticalHit,
} from "./critical.ts";

export type { CalculateMoveDamageByIdInput } from "./move-damage-query.ts";
export { UnknownMoveError, calculateMoveDamageById } from "./move-damage-query.ts";

// Phase 5D — the one canonical Type Chart. TYPE_CHART is exposed for
// completeness testing/inspection; calculateTypeEffectiveness is the
// actual entry point every damage calculation goes through internally.
export type { EffectivenessResult, TypeEffectiveness, TypeMatchups } from "./type-chart.ts";
export { TYPE_CHART, calculateTypeEffectiveness } from "./type-chart.ts";
