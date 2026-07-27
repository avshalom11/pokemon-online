// Public entry point for the pure damage calculation engine (Phase 5B.1:
// base formula + random factor; Phase 5B.2: wired into live battles;
// Phase 5C: STAB; Phase 5D: Type Effectiveness).
//
// Wired into live battles since Phase 5B.2 — the player's own attack goes
// through calculateMoveDamage (features/battle/utils/battle-damage-rules.ts's
// resolveAttackDamage, called from battle-action.service.ts). The wild's
// counter-attack still uses the unrelated, unchanged
// applyFixedAttack (engine/battle/battle-config.ts), since enemy move
// selection doesn't exist yet.
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
  CalculateMoveDamageInput,
  CalculateMoveDamageResult,
  DamageDefensiveStats,
  DamageOffensiveStats,
  DamagingMoveCategory,
  DamagingMoveResult,
  DefensiveStatKind,
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

export { rollDamageRandomFactor } from "./random.ts";

export type { CalculateMoveDamageByIdInput } from "./move-damage-query.ts";
export { UnknownMoveError, calculateMoveDamageById } from "./move-damage-query.ts";

// Phase 5D — the one canonical Type Chart. TYPE_CHART is exposed for
// completeness testing/inspection; calculateTypeEffectiveness is the
// actual entry point every damage calculation goes through internally.
export type { EffectivenessResult, TypeEffectiveness, TypeMatchups } from "./type-chart.ts";
export { TYPE_CHART, calculateTypeEffectiveness } from "./type-chart.ts";
