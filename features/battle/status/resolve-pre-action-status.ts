import type { MajorStatus } from "./major-status";

// Phase 6G — whether an actor's Pokémon actually gets to attempt its move
// this turn, purely from its own major status. Checked immediately before
// that actor's action executes (after turn order is already known) — see
// battle-action.service.ts. Never calculates damage, never generates UI
// strings, never persists anything, never selects a move; it only answers
// "can this Pokémon act, and did its status itself change as a result."
//
// Chosen timing rules (documented here since the task leaves them
// implementation-defined):
// - Sleep: the counter represents turns still fully asleep. Each check
//   decrements it first; reaching 0 wakes the Pokémon up, but — like a
//   real "Pokémon woke up!" — that wake-up itself still consumes the
//   turn (no move executes the turn it wakes).
// - Freeze: no counter — a flat per-check thaw chance. Thawing DOES allow
//   the move to execute that same turn (matches real thaw behavior).
// - Paralysis: a flat per-check "fully paralyzed" chance; the status
//   itself never clears on its own.

export const FULL_PARALYSIS_CHANCE = 0.25;
export const FREEZE_THAW_CHANCE = 0.2;
export const MIN_SLEEP_TURNS = 1;
export const MAX_SLEEP_TURNS = 3;

// Rolls a fresh sleep duration when sleep is first inflicted (see
// resolve-move-effects.ts) — a uniform integer in [1, 3].
export function rollSleepDuration(random: () => number = Math.random): number {
  return MIN_SLEEP_TURNS + Math.floor(random() * (MAX_SLEEP_TURNS - MIN_SLEEP_TURNS + 1));
}

export interface PreActionStatusContext {
  status: MajorStatus | null;
  sleepTurnsRemaining: number | null;
  // Only ever actually invoked when relevant (paralyzed/frozen
  // respectively) — a can-act check on a non-statused or
  // burned/poisoned actor never draws either roll.
  fullParalysisRoll: () => number;
  freezeThawRoll: () => number;
}

export type PreActionStatusOutcome = "can-act" | "fully-paralyzed" | "asleep" | "woke-up" | "frozen" | "thawed";

export interface PreActionStatusResult {
  outcome: PreActionStatusOutcome;
  // The status/counter AFTER this check — apply directly to persisted
  // state, never re-derived.
  status: MajorStatus | null;
  sleepTurnsRemaining: number | null;
}

// "woke-up" is deliberately NOT included: per this module's own documented
// rule, waking up still consumes the turn's action.
const CAN_ACT_OUTCOMES: readonly PreActionStatusOutcome[] = ["can-act", "thawed"];

export function canActThisTurn(outcome: PreActionStatusOutcome): boolean {
  return CAN_ACT_OUTCOMES.includes(outcome);
}

export function resolvePreActionStatus(context: PreActionStatusContext): PreActionStatusResult {
  const { status, sleepTurnsRemaining } = context;

  if (status === "paralysis") {
    if (context.fullParalysisRoll() < FULL_PARALYSIS_CHANCE) {
      return { outcome: "fully-paralyzed", status, sleepTurnsRemaining };
    }
    return { outcome: "can-act", status, sleepTurnsRemaining };
  }

  if (status === "sleep") {
    const remaining = (sleepTurnsRemaining ?? MIN_SLEEP_TURNS) - 1;
    if (remaining <= 0) {
      return { outcome: "woke-up", status: null, sleepTurnsRemaining: null };
    }
    return { outcome: "asleep", status: "sleep", sleepTurnsRemaining: remaining };
  }

  if (status === "freeze") {
    if (context.freezeThawRoll() < FREEZE_THAW_CHANCE) {
      return { outcome: "thawed", status: null, sleepTurnsRemaining: null };
    }
    return { outcome: "frozen", status, sleepTurnsRemaining };
  }

  return { outcome: "can-act", status, sleepTurnsRemaining };
}
