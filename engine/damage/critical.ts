import { DamageValidationError } from "./damage-errors.ts";

// Phase 5F — the basic Critical Hit gate for the Damage Engine. Deliberately
// independent of the pre-existing, disconnected engine/battle/
// damage-calculation.ts (which has its own, unrelated critical-hit logic),
// same rule every earlier Phase 5 sub-phase already established for
// battle-engine.ts/battle-ai.ts/turn-order.ts/accuracy.ts/
// type-effectiveness.ts/data/battle/type-chart.ts/data/moves/move-data.ts.
//
// One single, global critical chance — never move-dependent, never a
// per-species/per-ability ratio (those are explicitly out of scope this
// phase; see damage-calculation.ts's own doc comment). Centralized here as
// one exported constant so a later phase can tune it (e.g. a real variable
// critical-ratio system) without touching the roll/check plumbing below.
export const CRITICAL_HIT_CHANCE = 1 / 24;

// The modern (Gen 6+) critical-hit damage multiplier. Applied at most once,
// only after every other damage modifier (STAB, Type Effectiveness) — see
// calculateMoveDamage's own calculation-order comment.
export const CRITICAL_HIT_MULTIPLIER = 1.5;

// criticalRoll follows the same [0, 1) contract as Math.random() itself —
// unlike accuracyRoll's [0, 99] integer percent scale, this stays a raw
// float so CRITICAL_HIT_CHANCE can be tuned to any value (not just ones
// that divide evenly into 100) without changing the roll's shape.
export const MIN_CRITICAL_ROLL = 0;
export const MAX_CRITICAL_ROLL = 1;

export interface CriticalHitCheckResult {
  critical: boolean;
  criticalRoll: number | null;
}

function validateCriticalRoll(criticalRoll: number): void {
  if (!Number.isFinite(criticalRoll) || criticalRoll < MIN_CRITICAL_ROLL || criticalRoll >= MAX_CRITICAL_ROLL) {
    throw new DamageValidationError(
      `criticalRoll must be within [${MIN_CRITICAL_ROLL}, ${MAX_CRITICAL_ROLL}), got ${criticalRoll}`
    );
  }
}

// criticalRoll === undefined: no Phase 5F data was supplied at all (every
// pre-Phase-5F caller/input literal) — resolves to "never critical," the
// same "missing data means no-op" convention Phase 5C/5D/5E already use for
// their own optional fields, so every existing caller keeps compiling and
// behaving exactly as before.
//
// checkCriticalHit is only ever called by calculateMoveDamage when the hit
// actually landed, is a genuine damaging move, and the target isn't immune
// — a miss, a status/missing-power move, or a 0x-immune hit never reach
// this function at all (see calculateMoveDamage's own short-circuits), so
// their criticalRoll (if any was even supplied) is never validated either,
// exactly like accuracyRoll is never validated for those same cases.
//
// A criticalRoll outside [0, 1) fails loudly (DamageValidationError) rather
// than being silently clamped into range.
export function checkCriticalHit(criticalRoll: number | undefined): CriticalHitCheckResult {
  if (criticalRoll === undefined) {
    return { critical: false, criticalRoll: null };
  }

  validateCriticalRoll(criticalRoll);

  return { critical: criticalRoll < CRITICAL_HIT_CHANCE, criticalRoll };
}
