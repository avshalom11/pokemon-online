// Phase 6B/6C — pure turn-order resolution. Decides which of the two
// combatants (player's active Pokémon vs. the wild) acts first this turn.
// Deliberately isolated from everything else a turn does: no damage math,
// no Prisma, no HP mutation, no move selection, no UI strings — it only
// ever answers "who goes first," using data the caller already resolved
// (both sides' chosen move's priority, both sides' Speed stat, and an
// already-rolled tie-break value).
//
// Rule, in priority order (the same real-Pokémon rule the dormant
// engine/battle/turn-order.ts already modeled, reimplemented here against
// the live engine/moves Move type instead of the legacy one):
//   1. Higher move priority acts first.
//   2. If priorities are equal, higher Speed acts first.
//   3. If priorities and Speed are both equal, the injected tie-break
//      decides — never Math.random() called directly in here.

import type { BattleActor } from "../events/battle-event.types";

export type { BattleActor };

export interface TurnAction {
  actor: BattleActor;
  priority: number;
}

export interface ResolveTurnOrderInput {
  playerAction: TurnAction;
  enemyAction: TurnAction;
  playerSpeed: number;
  enemySpeed: number;
  // A pre-rolled value in [0, 1) — the same raw shape rollCriticalHit
  // (engine/damage/random.ts) already uses for its own tie-break-shaped
  // check. Callers draw this via rollTurnOrderTieBreak below; the pure
  // resolver itself never touches Math.random.
  tieBreakRoll: number;
}

// Production randomness for the turn-order tie-break, kept out of
// resolveTurnOrder itself so tests can inject a literal tieBreakRoll
// instead of stubbing Math.random — the exact same pattern
// engine/damage/random.ts's rollCriticalHit already establishes (a raw
// passthrough of random(), not an integer-percent transform).
export function rollTurnOrderTieBreak(random: () => number = Math.random): number {
  return random();
}

// Returns the two actors in the order they act this turn: [first, second].
export function resolveTurnOrder({
  playerAction,
  enemyAction,
  playerSpeed,
  enemySpeed,
  tieBreakRoll,
}: ResolveTurnOrderInput): [BattleActor, BattleActor] {
  if (playerAction.priority !== enemyAction.priority) {
    return playerAction.priority > enemyAction.priority ? ["player", "enemy"] : ["enemy", "player"];
  }

  if (playerSpeed !== enemySpeed) {
    return playerSpeed > enemySpeed ? ["player", "enemy"] : ["enemy", "player"];
  }

  return tieBreakRoll < 0.5 ? ["player", "enemy"] : ["enemy", "player"];
}
