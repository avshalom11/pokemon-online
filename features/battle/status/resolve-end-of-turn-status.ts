import type { MajorStatus } from "./major-status";

// Phase 6H — burn/poison residual damage, applied once per turn to
// whichever side(s) are still active and not already fainted. One
// canonical fraction for both statuses (this project's chosen generation
// policy: modern/Gen3+ 1/8 max HP, matching the modern-generation choices
// already made elsewhere — Type Chart, STAB — rather than Gen1's 1/16).
// Pure: no Prisma, no events, no strings — battle-action.service.ts turns
// this into persisted HP + structured events.

export const RESIDUAL_DAMAGE_FRACTION = 1 / 8;

export interface EndOfTurnStatusDamage {
  damage: number;
  remainingHp: number;
}

// Returns null when the status isn't burn/poison (no residual damage) —
// never a fabricated 0-damage result for an unrelated status.
export function resolveEndOfTurnStatusDamage(
  status: MajorStatus | null,
  currentHp: number,
  maxHp: number
): EndOfTurnStatusDamage | null {
  if (status !== "burn" && status !== "poison") return null;

  const damage = Math.max(1, Math.floor(maxHp * RESIDUAL_DAMAGE_FRACTION));
  const remainingHp = Math.max(0, currentHp - damage);

  return { damage, remainingHp };
}
