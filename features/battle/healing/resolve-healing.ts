// Phase 6J — pure healing-move calculation (Recover, Soft-Boiled, Rest,
// ...). Deliberately its own tiny module rather than a new branch inside
// resolve-move-effects.ts: healing never reads/produces stat-stage or
// status data, and doesn't gate on hit/immunity/fainted the way that
// resolver's four existing kinds do (a "heal" move always targets the
// user itself). No Prisma, no Hebrew strings, no move-selection, no
// React, no move id/name.
//
// Healing is always computed from MAXIMUM HP, never current HP — a 50%
// heal restores the same amount whether the Pokémon is at 1 HP or 99% HP.
// The amount actually applied is clamped so current HP can never exceed
// max HP; at full HP this clamps to exactly 0, which the caller (the
// battle service) reports as a failure event rather than a fabricated
// heal/no-op damage number.

export interface ResolveHealingInput {
  currentHp: number;
  maxHp: number;
  // From the move's own MoveEffect: { kind: "heal", healPercent }.
  healPercent: number;
}

export interface ResolveHealingResult {
  // Actual HP restored — 0 whenever there was no room to heal.
  healed: number;
  remainingHp: number;
  // False exactly when healed === 0 (already at, or above, max HP).
  success: boolean;
}

export function resolveHealing({ currentHp, maxHp, healPercent }: ResolveHealingInput): ResolveHealingResult {
  const calculatedHealing = Math.floor((maxHp * healPercent) / 100);
  const healed = Math.max(0, Math.min(calculatedHealing, maxHp - currentHp));

  return {
    healed,
    remainingHp: currentHp + healed,
    success: healed > 0,
  };
}
