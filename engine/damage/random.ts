import { MAX_DAMAGE_RANDOM_FACTOR, MIN_DAMAGE_RANDOM_FACTOR } from "./damage-calculation.ts";

// Production randomness for move damage, kept out of calculateMoveDamage
// itself so tests can inject a literal randomFactor instead of stubbing
// Math.random. Rolls a uniform integer percent in [85, 100] and divides by
// 100, so both 0.85 and 1.00 are reachable exactly (unlike sampling
// Math.random() * 0.15 + 0.85, whose half-open [0, 1) range can never
// land on the 1.00 boundary).
const MIN_ROLL_PERCENT = Math.round(MIN_DAMAGE_RANDOM_FACTOR * 100);
const MAX_ROLL_PERCENT = Math.round(MAX_DAMAGE_RANDOM_FACTOR * 100);

export function rollDamageRandomFactor(random: () => number = Math.random): number {
  const rollWidth = MAX_ROLL_PERCENT - MIN_ROLL_PERCENT + 1;
  const rollPercent = MIN_ROLL_PERCENT + Math.floor(random() * rollWidth);

  return rollPercent / 100;
}

// Phase 5E — production randomness for the accuracy check, kept out of
// checkMoveAccuracy itself (accuracy.ts) so tests can inject a literal
// accuracyRoll instead of stubbing Math.random, same rule as
// rollDamageRandomFactor above. Rolls a uniform integer in [0, 99]: hit
// whenever this is less than the move's own accuracy, so accuracy 100 is
// unmissable (0-99 is always < 100) and accuracy 0 always misses (nothing
// is ever < 0). This is a separate roll from rollDamageRandomFactor's own —
// real battles draw one random value per purpose, never reusing one roll
// for two different checks.
export function rollAccuracyCheck(random: () => number = Math.random): number {
  return Math.floor(random() * 100);
}

// Phase 5F — production randomness for the critical-hit check, kept out of
// checkCriticalHit itself (critical.ts) so tests can inject a literal
// criticalRoll instead of stubbing Math.random, same rule as
// rollDamageRandomFactor/rollAccuracyCheck above. Unlike the accuracy roll,
// this stays a raw float in [0, 1) — the same shape random() itself
// produces — rather than an integer percent, so CRITICAL_HIT_CHANCE (1/24)
// can be compared directly without a rounding-friendly denominator. This is
// a separate roll from both rollDamageRandomFactor's and
// rollAccuracyCheck's own — real battles draw one random value per
// purpose, never reusing one roll for two different checks.
export function rollCriticalHit(random: () => number = Math.random): number {
  return random();
}
