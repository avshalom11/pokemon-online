import type { VolatileState } from "./volatile-condition.types";

// Phase 7 — the two volatile conditions that can prevent an actor's action
// this turn: flinch (checked immediately before major-status, per this
// project's documented pre-action order) and confusion (checked
// immediately after major-status). Mirrors resolve-pre-action-status.ts's
// own shape/conventions (injectable rolls, "decrement then check" for a
// finite duration) but is entirely independent of it — confusion is a
// volatile condition, never a MajorStatus, and can coexist with any of
// them.

// Flinch never has its own duration counter — it is a same-turn-only flag
// (see VolatileState's own doc comment) that either prevents this one
// action or does nothing at all; either way it never survives past the
// end of this turn (battle-action.service.ts clears it unconditionally at
// end-of-turn for whichever side never got to consume it).
export function resolvePreActionFlinch(volatile: VolatileState): boolean {
  return volatile.flinch === true;
}

export const MIN_CONFUSION_TURNS = 1;
export const MAX_CONFUSION_TURNS = 4;
// Canonical Gen 1-6 confusion self-hit chance (Gen 7+ changed this, out of
// scope — this project has no generation-specific policy beyond Gen 1
// data, so the long-standing classic value is used).
export const CONFUSION_SELF_HIT_CHANCE = 0.5;

// Rolled once when confusion is first applied (resolve-volatile-effects.ts)
// — a uniform integer in [1, 4], the same shape rollSleepDuration already
// uses for its own [1, 3] range.
export function rollConfusionDuration(random: () => number = Math.random): number {
  return MIN_CONFUSION_TURNS + Math.floor(random() * (MAX_CONFUSION_TURNS - MIN_CONFUSION_TURNS + 1));
}

export type ConfusionPreActionOutcome = "not-confused" | "recovered" | "acts-normally" | "hurts-itself";

export interface ResolvePreActionConfusionInput {
  confusion?: { turnsRemaining: number };
  // Only ever invoked when the Pokémon is actually still confused this
  // turn (i.e. not "not-confused" or "recovered") — recovering this turn
  // never rolls for a self-hit, exactly like a status move's chance-gated
  // effect never rolls when the move itself didn't apply.
  selfHitRoll: () => number;
}

export interface ResolvePreActionConfusionResult {
  outcome: ConfusionPreActionOutcome;
  // The confusion state AFTER this check — undefined means "no longer
  // confused" (either it just recovered, or it was never confused to
  // begin with); apply directly to persisted state, never re-derived.
  updatedConfusion?: { turnsRemaining: number };
}

// Decrements the remaining duration first, exactly like sleep's own
// "decrement then check <=0" rule (resolve-pre-action-status.ts) — unlike
// waking from sleep, recovering from confusion does NOT consume the turn's
// action (real-game behavior: the Pokémon can still attack normally the
// same turn its confusion ends).
export function resolvePreActionConfusion({ confusion, selfHitRoll }: ResolvePreActionConfusionInput): ResolvePreActionConfusionResult {
  if (!confusion) {
    return { outcome: "not-confused" };
  }

  const remaining = confusion.turnsRemaining - 1;
  if (remaining <= 0) {
    return { outcome: "recovered" };
  }

  const updatedConfusion = { turnsRemaining: remaining };

  if (selfHitRoll() < CONFUSION_SELF_HIT_CHANCE) {
    return { outcome: "hurts-itself", updatedConfusion };
  }

  return { outcome: "acts-normally", updatedConfusion };
}
