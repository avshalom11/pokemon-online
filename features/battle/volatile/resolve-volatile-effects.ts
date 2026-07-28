import type { MoveEffect, StatusCondition } from "@/engine/moves";
import type { PokemonType } from "@/shared/types/pokemon";

import type { BattleActor, BattleEvent } from "@/features/battle/events/battle-event.types";
import { isMajorStatus } from "@/features/battle/status/major-status";
import { rollConfusionDuration } from "./resolve-pre-action-volatile";
import type { VolatileState } from "./volatile-condition.types";

// Phase 7 — the volatile counterpart of features/battle/effects/
// resolve-move-effects.ts: the one generic resolver every move's `effect`
// runs through for the 7 Volatile Conditions (confusion, flinch, protect,
// disable, encore, leech seed, trapping). Deliberately separate from that
// file rather than folded into it — resolve-move-effects.ts documents
// itself as handling exactly 4 major-status/stat-stage kinds and is left
// completely untouched (zero risk to its existing tests); this module
// handles everything volatile instead. A single move's `effect.kind` can
// only ever match ONE of the two resolvers (the caller —
// battle-action.service.ts — decides which one based on the effect kind,
// and for "status"/"damage-with-status-chance" specifically, on whether
// the StatusCondition is a MajorStatus or not), so exactly one of them
// ever does real work per move, and neither one ever double-rolls a
// chance-gated effect. Pure: no Prisma, no Hebrew, no move selection, no
// damage formula, no move id/name branching — only `effect.kind` and its
// own data drive behavior.
//
// Confusion and flinch reuse the Move Registry's existing "status" /
// "damage-with-status-chance" kinds (both already carry a StatusCondition,
// which already includes "confusion"/"flinch" — see
// engine/moves/effects/effect-types.ts) rather than new dedicated kinds.
// leech-seed, disable-move, and partial-trap (trapping) are pre-existing
// Phase 3B kinds, reused as-is. protect and encore are this phase's only
// genuinely new kinds.

export interface ResolveVolatileEffectsInput {
  effect: MoveEffect;
  // Whoever USED the move (needed as leechSeed/trapping's own `source`).
  actor: BattleActor;
  // Whoever the effect actually applies to (self for protect/encore since
  // they affect the user or force the user's own next move — wait: encore
  // and disable both target the OPPONENT, protect targets self; already
  // resolved by the caller from the move's own `target` field, same
  // convention resolve-move-effects.ts already uses).
  effectTargetActor: BattleActor;
  hit: boolean;
  immuneToTarget: boolean;
  effectTargetFainted: boolean;
  effectTargetTypes: readonly PokemonType[];
  effectTargetVolatile: VolatileState;
  // Only ever invoked when a chance-gated effect (damage-with-status-
  // chance) is actually present on this move — mirrors
  // resolve-move-effects.ts's own effectChanceRoll contract exactly, and
  // is the SAME roll a caller would otherwise have drawn through that
  // file for a major-status move; never drawn twice for one move.
  effectChanceRoll: () => number;
  // Only ever invoked when a NEW confusion is actually being applied.
  confusionDurationRoll: () => number;
  // Only ever invoked when disable/encore/trapping is actually being
  // newly applied.
  disableDurationRoll: () => number;
  encoreDurationRoll: () => number;
  trappingDurationRoll: () => number;
}

export interface ResolveVolatileEffectsResult {
  events: BattleEvent[];
  updatedTargetVolatile: VolatileState;
}

function noOpResult(volatile: VolatileState): ResolveVolatileEffectsResult {
  return { events: [], updatedTargetVolatile: volatile };
}

export const MIN_DISABLE_TURNS = 2;
export const MAX_DISABLE_TURNS = 5;
export const MIN_ENCORE_TURNS = 2;
export const MAX_ENCORE_TURNS = 5;
export const MIN_TRAPPING_TURNS = 2;
export const MAX_TRAPPING_TURNS = 5;

// A simple documented uniform [2, 5] range — this project has no Gen 1
// canonical policy for Disable/Encore/Trapping duration precise enough to
// reuse (real Gen 1 Disable is a wide, unusual 1-8 range; Encore doesn't
// exist until Gen 2), so one consistent, easy-to-reason-about range is
// used for all three rather than three different guesses.
function rollUniformTurns(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function resolveVolatileEffects(input: ResolveVolatileEffectsInput): ResolveVolatileEffectsResult {
  const { effect, effectTargetActor } = input;
  let volatile = input.effectTargetVolatile;
  const events: BattleEvent[] = [];

  function rolledChance(chancePercent: number): boolean {
    return input.effectChanceRoll() * 100 < chancePercent;
  }

  function applyConfusionOrFlinch(status: StatusCondition): void {
    if (isMajorStatus(status)) return; // not this resolver's concern

    if (status === "confusion") {
      if (volatile.confusion) {
        events.push({ type: "volatile-application-failed", actor: effectTargetActor, condition: "confusion", reason: "already-active" });
        return;
      }
      const turnsRemaining = rollConfusionDuration(input.confusionDurationRoll);
      volatile = { ...volatile, confusion: { turnsRemaining } };
      events.push({ type: "volatile-applied", actor: effectTargetActor, condition: "confusion" });
      return;
    }

    if (status === "flinch") {
      volatile = { ...volatile, flinch: true };
      events.push({ type: "volatile-applied", actor: effectTargetActor, condition: "flinch" });
    }
  }

  if (!input.hit || input.immuneToTarget || input.effectTargetFainted) {
    return noOpResult(volatile);
  }

  switch (effect.kind) {
    case "status":
      applyConfusionOrFlinch(effect.status);
      break;

    case "damage-with-status-chance":
      if (rolledChance(effect.chancePercent)) applyConfusionOrFlinch(effect.status);
      break;

    case "leech-seed": {
      if (volatile.leechSeed) {
        events.push({ type: "volatile-application-failed", actor: effectTargetActor, condition: "leech-seed", reason: "already-active" });
        break;
      }
      // Canonical Gen 1+ immunity — Grass-type Pokémon can't be seeded.
      if (input.effectTargetTypes.includes("grass")) {
        events.push({ type: "volatile-application-failed", actor: effectTargetActor, condition: "leech-seed", reason: "immune" });
        break;
      }
      volatile = { ...volatile, leechSeed: { source: input.actor } };
      events.push({ type: "volatile-applied", actor: effectTargetActor, condition: "leech-seed" });
      break;
    }

    case "partial-trap": {
      if (volatile.trapping) {
        events.push({ type: "volatile-application-failed", actor: effectTargetActor, condition: "trapping", reason: "already-active" });
        break;
      }
      const turnsRemaining = rollUniformTurns(MIN_TRAPPING_TURNS, MAX_TRAPPING_TURNS, input.trappingDurationRoll);
      volatile = { ...volatile, trapping: { source: input.actor, turnsRemaining } };
      events.push({ type: "volatile-applied", actor: effectTargetActor, condition: "trapping" });
      break;
    }

    case "disable-move": {
      const targetMoveId = volatile.lastUsedMoveId;
      if (!targetMoveId) {
        events.push({ type: "volatile-application-failed", actor: effectTargetActor, condition: "disable", reason: "no-valid-move" });
        break;
      }
      const turnsRemaining = rollUniformTurns(MIN_DISABLE_TURNS, MAX_DISABLE_TURNS, input.disableDurationRoll);
      // Disable+Encore can never validly agree on the exact same move at
      // once — see this module's own header comment and Encore's mirrored
      // guard below. Clearing Encore here is the simplest documented
      // resolution the task explicitly allows, rather than a bigger
      // conflict-tracking system.
      const encoreStillValid = volatile.encore && volatile.encore.moveId !== targetMoveId;
      volatile = { ...volatile, disable: { moveId: targetMoveId, turnsRemaining }, encore: encoreStillValid ? volatile.encore : undefined };
      events.push({ type: "move-disabled", actor: effectTargetActor, moveId: targetMoveId });
      break;
    }

    case "encore": {
      const targetMoveId = volatile.lastUsedMoveId;
      if (!targetMoveId || targetMoveId === volatile.disable?.moveId) {
        events.push({ type: "volatile-application-failed", actor: effectTargetActor, condition: "encore", reason: "no-valid-move" });
        break;
      }
      const turnsRemaining = rollUniformTurns(MIN_ENCORE_TURNS, MAX_ENCORE_TURNS, input.encoreDurationRoll);
      volatile = { ...volatile, encore: { moveId: targetMoveId, turnsRemaining } };
      events.push({ type: "encore-applied", actor: effectTargetActor, moveId: targetMoveId });
      break;
    }

    default:
      // Every other MoveEffect kind (damage, heal, recoil, multi-hit,
      // stat-change, major status, protect, ...) — deliberately out of
      // scope for THIS resolver, a no-op rather than an error. "protect"
      // is handled separately below (resolveProtectAttempt) since it's
      // self-targeted and resolved BEFORE accuracy, not through this
      // hit-gated switch.
      break;
  }

  return { events, updatedTargetVolatile: volatile };
}

export interface ResolveProtectAttemptResult {
  success: boolean;
  updatedVolatile: VolatileState;
  event: BattleEvent;
}

// Canonical Gen 2+ declining Protect success chance: 100% on the first
// consecutive use, then x(1/3) each additional consecutive use (100%,
// ~33%, ~11%, ...). consecutiveUses is the count BEFORE this attempt (0 on
// a fresh streak). Resolved separately from resolveVolatileEffects above
// since Protect is self-targeted and always resolves before accuracy —
// never gated by hit/immunity/fainted like every other kind in this file.
export function resolveProtectAttempt(actor: BattleActor, volatile: VolatileState, successRoll: () => number): ResolveProtectAttemptResult {
  const consecutiveUses = volatile.protect?.consecutiveUses ?? 0;
  const chance = Math.pow(1 / 3, consecutiveUses);
  const success = successRoll() < chance;

  if (!success) {
    return {
      success: false,
      updatedVolatile: { ...volatile, protect: undefined },
      event: { type: "volatile-application-failed", actor, condition: "protect", reason: "failed" },
    };
  }

  return {
    success: true,
    updatedVolatile: { ...volatile, protect: { active: true, consecutiveUses: consecutiveUses + 1 } },
    event: { type: "volatile-applied", actor, condition: "protect" },
  };
}

// Whether `defenderVolatile` is currently shielded from an opponent-
// targeted move — a plain read, not worth its own module.
export function isProtected(defenderVolatile: VolatileState): boolean {
  return defenderVolatile.protect?.active === true;
}
