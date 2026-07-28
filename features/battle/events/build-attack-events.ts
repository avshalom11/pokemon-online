import type { CalculateMoveDamageResult } from "@/engine/damage";

import type { BattleActor, BattleEvent } from "./battle-event.types";

// Phase 6A — pure translation from one already-computed Damage Engine
// result (Phase 5B-5G: hit/miss, STAB, Type Effectiveness, Critical Hits,
// Battle Outcome Metadata) into an ordered list of structured Battle
// Events. Never recomputes anything the Engine already decided, never
// generates a string — see format-battle-events.ts for that.
//
// Event order (matches the Phase 6A spec exactly):
//   normal hit:  move-used, critical-hit?, effectiveness?, damage-dealt, fainted?
//   miss:        move-used, move-missed                    (no damage-dealt)
//   immune hit:  move-used, effectiveness("none"), damage-dealt(0)  (no critical-hit)
//   status move: move-used only — nothing else can be safely inferred.
function otherActor(actor: BattleActor): BattleActor {
  return actor === "player" ? "enemy" : "player";
}

export interface BuildAttackEventsInput {
  actor: BattleActor;
  attackerPokemonId: string;
  defenderPokemonId: string;
  moveId: string;
  result: CalculateMoveDamageResult;
  // The defender's HP after this attack resolved — the caller (the
  // service) already computed this by clamping at 0; passed in rather
  // than recomputed here so this stays a pure formatting step, never a
  // second source of HP-math truth.
  remainingDefenderHp: number;
}

export function buildAttackEvents({
  actor,
  attackerPokemonId,
  defenderPokemonId,
  moveId,
  result,
  remainingDefenderHp,
}: BuildAttackEventsInput): BattleEvent[] {
  const events: BattleEvent[] = [{ type: "move-used", actor, pokemonId: attackerPokemonId, moveId }];

  // A status move (or a powerless one) has no hit/miss/effectiveness/
  // critical concept at all — the Engine's own non-damaging result, not a
  // fabricated one here (Phase 5G's own rule, carried through unchanged).
  if (result.kind === "non-damaging") {
    return events;
  }

  if (!result.hit) {
    events.push({ type: "move-missed", actor, pokemonId: attackerPokemonId, moveId });
    return events;
  }

  events.push(...buildHitEvents({ actor, defenderPokemonId, result, remainingDefenderHp }));

  return events;
}

export interface BuildHitEventsInput {
  actor: BattleActor;
  defenderPokemonId: string;
  // Must already be a confirmed hit (result.hit === true, result.kind ===
  // "damage") — Phase 6L's multi-hit sequence resolves its one overall
  // accuracy check via buildAttackEvents above (hit 1), then reuses this
  // narrower helper for every subsequent, already-guaranteed hit so the
  // critical-hit/effectiveness/damage-dealt/fainted shape is never
  // duplicated between the single-hit and multi-hit paths.
  result: CalculateMoveDamageResult;
  remainingDefenderHp: number;
}

export function buildHitEvents({ actor, defenderPokemonId, result, remainingDefenderHp }: BuildHitEventsInput): BattleEvent[] {
  if (result.kind !== "damage") {
    return [];
  }

  const events: BattleEvent[] = [];

  if (result.critical) {
    events.push({ type: "critical-hit", actor });
  }

  if (result.effectiveness !== "normal") {
    events.push({ type: "effectiveness", actor, value: result.effectiveness });
  }

  const target = otherActor(actor);
  events.push({ type: "damage-dealt", actor, target, damage: result.damage, remainingHp: remainingDefenderHp });

  if (remainingDefenderHp <= 0) {
    events.push({ type: "fainted", actor: target, pokemonId: defenderPokemonId });
  }

  return events;
}

// Emitted instead of a move-used event for whichever side's pending
// action never happens this turn — one consistent approach (never a bare,
// unexplained gap in the event list) for both directions (player skipped,
// enemy skipped) and both reasons (its own Pokémon fainted first, or its
// own Pokémon is fine but there's no valid target left to attack — see
// battle-event.types.ts's own doc comment on "action-skipped").
export function buildActionSkippedEvent(actor: BattleActor, reason: "fainted-before-action" | "no-valid-target"): BattleEvent {
  return { type: "action-skipped", actor, reason };
}
