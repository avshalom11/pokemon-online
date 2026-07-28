// Phase 6K — pure drain-healing and recoil-damage calculation (Absorb,
// Mega Drain, Giga Drain, Leech Life, Dream Eater for drain; Take Down,
// Double-Edge, Submission, Brave Bird for recoil). Both are keyed off the
// ACTUAL HP the target lost this hit (already clamped by the caller to
// the target's remaining HP), never the raw Damage Engine output — a hit
// that calculates 30 damage against a target with only 8 HP left actually
// only dealt 8, and that 8 is what a half-drain/recoil move must use.
//
// Kept as one small module (rather than two) since both share the exact
// same "percent of actual damage dealt" basis and differ only in their
// floor: drain can legitimately restore 0 (the user was already at max
// HP), recoil never rounds down to 0 damage once it applies at all (a
// move that dealt positive damage always recoils for at least 1). No
// Prisma, no Hebrew strings, no move id/name.

export interface ResolveDrainHealingInput {
  actualDamageDealt: number;
  drainPercent: number;
  currentHp: number;
  maxHp: number;
}

export interface ResolveDrainHealingResult {
  healed: number;
  remainingHp: number;
}

export function resolveDrainHealing({
  actualDamageDealt,
  drainPercent,
  currentHp,
  maxHp,
}: ResolveDrainHealingInput): ResolveDrainHealingResult {
  if (actualDamageDealt <= 0) {
    return { healed: 0, remainingHp: currentHp };
  }

  const calculatedHealing = Math.floor((actualDamageDealt * drainPercent) / 100);
  const healed = Math.max(0, Math.min(calculatedHealing, maxHp - currentHp));

  return { healed, remainingHp: currentHp + healed };
}

export interface ResolveRecoilDamageInput {
  actualDamageDealt: number;
  recoilPercent: number;
  currentHp: number;
}

export interface ResolveRecoilDamageResult {
  damage: number;
  remainingHp: number;
}

export function resolveRecoilDamage({
  actualDamageDealt,
  recoilPercent,
  currentHp,
}: ResolveRecoilDamageInput): ResolveRecoilDamageResult {
  if (actualDamageDealt <= 0) {
    return { damage: 0, remainingHp: currentHp };
  }

  // Never rounds down to 0 once recoil genuinely applies — a move that hit
  // for positive damage always costs its user at least 1 HP back.
  const damage = Math.max(1, Math.floor((actualDamageDealt * recoilPercent) / 100));
  const remainingHp = Math.max(0, currentHp - damage);

  return { damage, remainingHp };
}
