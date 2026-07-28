import type { MoveEffect, StatStageChange, StatusCondition } from "@/engine/moves";
import type { PokemonType } from "@/shared/types/pokemon";

import type { BattleActor, BattleEvent } from "../events/battle-event.types";
import { canApplyStatus, isMajorStatus, type MajorStatus } from "../status/major-status";
import { rollSleepDuration } from "../status/resolve-pre-action-status";
import { changeStatStage, type StatStages } from "../stats/stat-stages";

// Phase 6D/6I — the one generic resolver every move's `effect` (the
// existing Move Registry field — see engine/moves/effects/effect-schema.ts;
// this project does NOT add a second, parallel effects table/field) is
// executed through, whether it's a standalone status move (growl,
// thunder-wave, sleep-powder, ...) or a damaging move's secondary effect
// (ember's burn chance, thunderbolt's paralysis chance, ...). No move id
// or name ever appears here — only the move's own `effect.kind` and data
// drive behavior. Pure: no Prisma, no Hebrew strings, no move selection,
// no base-damage math, no React.
//
// Only the 4 effect kinds this phase actually implements are handled:
// "stat-change", "status", "damage-with-status-chance",
// "damage-with-stat-change-chance". Every other existing MoveEffect kind
// (heal, recoil, multi-hit, ohko, ...) is explicitly out of scope this
// phase and resolves to a no-op here — never a thrown error, since plenty
// of "data-only" moves in the registry already carry those kinds without
// any battle engine support yet.

export interface ResolveMoveEffectsInput {
  effect: MoveEffect;
  // Whose Pokémon the effect actually applies to — already resolved by
  // the caller from the move's own `target` field ("self" -> the
  // attacker, anything else -> the opponent), since this project's
  // battles are always 1v1 and every move here targets exactly one side.
  effectTargetActor: BattleActor;
  // Whether the move itself landed at all (a miss never applies effects).
  hit: boolean;
  // True only when effectTargetActor is the opponent AND the damage
  // result was a type immunity (0x) — a self-targeted effect is never
  // gated by the opponent's type effectiveness.
  immuneToTarget: boolean;
  // True when effectTargetActor's own Pokémon just fainted from this same
  // attack — a fainted Pokémon never receives a stat-change or status.
  effectTargetFainted: boolean;
  effectTargetStages: StatStages;
  effectTargetCurrentStatus: MajorStatus | null;
  effectTargetTypes: readonly PokemonType[];
  // Only ever invoked when a chance-gated effect (damage-with-status-
  // chance / damage-with-stat-change-chance) is actually present on this
  // move — a guaranteed effect (stat-change/status with no chance field)
  // never draws this roll at all.
  effectChanceRoll: () => number;
  // Only ever invoked when a NEW sleep status is actually being applied.
  sleepDurationRoll: () => number;
}

export interface AppliedStatus {
  status: MajorStatus;
  turnsRemaining: number | null;
}

export interface ResolveMoveEffectsResult {
  events: BattleEvent[];
  updatedStages: StatStages;
  appliedStatus: AppliedStatus | null;
}

function noOpResult(stages: StatStages): ResolveMoveEffectsResult {
  return { events: [], updatedStages: stages, appliedStatus: null };
}

export function resolveMoveEffects(input: ResolveMoveEffectsInput): ResolveMoveEffectsResult {
  const { effect, effectTargetActor } = input;

  if (!input.hit || input.immuneToTarget || input.effectTargetFainted) {
    return noOpResult(input.effectTargetStages);
  }

  const events: BattleEvent[] = [];
  let updatedStages = input.effectTargetStages;
  let appliedStatus: AppliedStatus | null = null;

  function applyStatChanges(changes: StatStageChange[]): void {
    for (const change of changes) {
      const result = changeStatStage(updatedStages, change.stat, change.stages);
      updatedStages = result.stages;

      if (result.limited) {
        events.push({
          type: "stat-stage-limit",
          actor: effectTargetActor,
          stat: change.stat,
          direction: change.stages > 0 ? "higher" : "lower",
        });
      } else {
        events.push({
          type: "stat-stage-changed",
          actor: effectTargetActor,
          stat: change.stat,
          previousStage: result.previousStage,
          newStage: result.newStage,
        });
      }
    }
  }

  function applyStatus(status: StatusCondition): void {
    if (!isMajorStatus(status)) return;

    const canApply = canApplyStatus(input.effectTargetCurrentStatus, status, input.effectTargetTypes);
    if (!canApply.applied) {
      events.push({ type: "status-application-failed", actor: effectTargetActor, status, reason: canApply.reason });
      return;
    }

    const turnsRemaining = status === "sleep" ? rollSleepDuration(input.sleepDurationRoll) : null;
    appliedStatus = { status, turnsRemaining };
    events.push({ type: "status-applied", actor: effectTargetActor, status });
  }

  function rolledChance(chancePercent: number): boolean {
    return input.effectChanceRoll() * 100 < chancePercent;
  }

  switch (effect.kind) {
    case "stat-change":
      applyStatChanges(effect.changes);
      break;
    case "damage-with-stat-change-chance":
      if (rolledChance(effect.chancePercent)) applyStatChanges(effect.changes);
      break;
    case "status":
      applyStatus(effect.status);
      break;
    case "damage-with-status-chance":
      if (rolledChance(effect.chancePercent)) applyStatus(effect.status);
      break;
    default:
      // Every other MoveEffect kind (heal, recoil, multi-hit, ohko, ...) —
      // deliberately out of scope this phase, a no-op rather than an error.
      break;
  }

  return { events, updatedStages, appliedStatus };
}
