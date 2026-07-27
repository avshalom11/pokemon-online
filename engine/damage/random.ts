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
