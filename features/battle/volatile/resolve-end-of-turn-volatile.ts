import type { BattleActor, BattleEvent } from "@/features/battle/events/battle-event.types";
import type { VolatileState } from "./volatile-condition.types";

// Phase 7 — end-of-turn volatile processing for ONE side: trapping
// residual damage, Leech Seed residual damage (plus the actual amount to
// heal the opponent by — applying that heal to the OTHER side is the
// caller's job, exactly like drain's own actual-damage-dealt convention in
// features/battle/healing/resolve-hp-transfer.ts, reused here rather than
// duplicated), and the plain turn-countdown for Disable/Encore/Protect.
// Confusion is NOT handled here — it's a pre-action condition (see
// resolve-pre-action-volatile.ts), never an end-of-turn one. Pure: no
// Prisma, no Hebrew, no move id/name.
//
// Processing order within one side's own tick (documented since it's easy
// to get wrong when extending this): Protect's one-turn "active" flag
// clears first (regardless of whether it blocked anything this turn) →
// trapping damage → Leech Seed damage → Disable/Encore countdown. Trapping
// before Leech Seed is an arbitrary but consistent choice — the two can
// coexist in theory, and this is the one documented order.

export const TRAPPING_DAMAGE_FRACTION = 1 / 16;
export const LEECH_SEED_DAMAGE_FRACTION = 1 / 8;
const MIN_RESIDUAL_DAMAGE = 1;

export interface EndOfTurnVolatileInput {
  actor: BattleActor;
  volatile: VolatileState;
  currentHp: number;
  maxHp: number;
  // Whether the OPPONENT (the only possible `source` of trapping/Leech
  // Seed against this side in a 1v1 battle) has already fainted this turn
  // — trapping never leaves an invalid permanent trap behind if its own
  // source is gone.
  opponentFainted: boolean;
}

export interface EndOfTurnVolatileResult {
  updatedVolatile: VolatileState;
  updatedHp: number;
  fainted: boolean;
  events: BattleEvent[];
  // The actual HP just lost to Leech Seed this tick (0 when not seeded, or
  // already fainted before this tick) — the caller heals the opponent by
  // exactly this much (clamped to their own max HP), never the raw
  // fraction, matching drain's own "actual HP lost" rule.
  leechSeedDrainAmount: number;
}

export function resolveEndOfTurnVolatile(input: EndOfTurnVolatileInput): EndOfTurnVolatileResult {
  const { actor, maxHp } = input;
  let volatile = input.volatile;
  let hp = input.currentHp;
  const events: BattleEvent[] = [];
  let leechSeedDrainAmount = 0;

  if (volatile.protect?.active) {
    volatile = { ...volatile, protect: { ...volatile.protect, active: false } };
  }

  if (volatile.trapping && hp > 0) {
    if (input.opponentFainted) {
      volatile = { ...volatile, trapping: undefined };
      events.push({ type: "volatile-ended", actor, condition: "trapping" });
    } else {
      const damage = Math.max(MIN_RESIDUAL_DAMAGE, Math.floor(maxHp * TRAPPING_DAMAGE_FRACTION));
      hp = Math.max(0, hp - damage);
      events.push({ type: "trapping-damage", actor, damage, remainingHp: hp });

      if (hp > 0) {
        const turnsRemaining = volatile.trapping.turnsRemaining - 1;
        if (turnsRemaining <= 0) {
          volatile = { ...volatile, trapping: undefined };
          events.push({ type: "volatile-ended", actor, condition: "trapping" });
        } else {
          volatile = { ...volatile, trapping: { ...volatile.trapping, turnsRemaining } };
        }
      }
    }
  }

  if (volatile.leechSeed && hp > 0) {
    const damage = Math.max(MIN_RESIDUAL_DAMAGE, Math.floor(maxHp * LEECH_SEED_DAMAGE_FRACTION));
    const newHp = Math.max(0, hp - damage);
    leechSeedDrainAmount = hp - newHp;
    hp = newHp;
    events.push({ type: "leech-seed-damage", actor, damage: leechSeedDrainAmount, remainingHp: hp });
  }

  if (volatile.disable) {
    const turnsRemaining = volatile.disable.turnsRemaining - 1;
    if (turnsRemaining <= 0) {
      volatile = { ...volatile, disable: undefined };
      events.push({ type: "volatile-ended", actor, condition: "disable" });
    } else {
      volatile = { ...volatile, disable: { ...volatile.disable, turnsRemaining } };
    }
  }

  if (volatile.encore) {
    const turnsRemaining = volatile.encore.turnsRemaining - 1;
    if (turnsRemaining <= 0) {
      volatile = { ...volatile, encore: undefined };
      events.push({ type: "volatile-ended", actor, condition: "encore" });
    } else {
      volatile = { ...volatile, encore: { ...volatile.encore, turnsRemaining } };
    }
  }

  return { updatedVolatile: volatile, updatedHp: hp, fainted: hp <= 0, events, leechSeedDrainAmount };
}
