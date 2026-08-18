import type { BattleEvent } from "@/features/battle/events/battle-event.types";

// ATTACK SOUND (GYM BATTLE POLISH task, section 3/5) — the pure decision
// logic behind GymBattleContent's own attack-sound trigger, extracted so
// it's unit-testable without a React render harness (this project has
// none — see every existing Gym test, all plain node:test service/data
// checks). Reads straight off the turn's own structured BattleEvent[]
// ("move-used" per actor, battle-turn-engine.ts) rather than inferring
// from damage numbers: an actor whose action was skipped entirely (e.g.
// "action-skipped"/"fainted-before-action") correctly never counts as
// having attacked, so the caller never fakes a sound for an attack that
// didn't happen.
export interface AttackSoundDecision {
  readonly playerAttacked: boolean;
  readonly enemyAttacked: boolean;
}

export function decideAttackSoundsForTurn(events: readonly BattleEvent[]): AttackSoundDecision {
  return {
    playerAttacked: events.some((event) => event.type === "move-used" && event.actor === "player"),
    enemyAttacked: events.some((event) => event.type === "move-used" && event.actor === "enemy"),
  };
}
