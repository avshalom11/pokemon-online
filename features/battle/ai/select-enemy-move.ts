import type { KnownMoveId } from "@/engine/known-moves";

// Phase 5H — Enemy Move Selection. Answers exactly one question: which
// move id does the enemy use this turn. Contains no battle logic of its
// own — no accuracy, damage, STAB, type effectiveness, critical hits, or
// PP awareness. Those all still live exclusively in the Damage Engine and
// are applied afterward by whoever calls this (see
// features/battle/services/battle-action.service.ts), exactly the same
// way the player's own already-selected move is. This is deliberately not
// a smart AI: every known move is equally likely, regardless of its
// power, accuracy, type, or anything else about it.

export class NoUsableEnemyMoveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoUsableEnemyMoveError";
  }
}

// Reuses the exact same randomness architecture as
// engine/damage/random.ts's rollDamageRandomFactor/rollAccuracyCheck/
// rollCriticalHit: an injectable `() => number` defaulting to Math.random,
// so production callers never pass anything and tests inject a fixed
// function instead of stubbing Math.random globally. Math.random is never
// called directly inside this function — only ever as that default
// parameter value.
//
// Chooses uniformly among every id in `knownMoveIds`: one random index via
// the same floor(random() * length) idiom rollDamageRandomFactor already
// uses for its own integer roll, so every known move has exactly equal
// probability — no weighting, and no inspection of power, accuracy, type,
// STAB, effectiveness, or PP.
//
// An empty list means the enemy has no usable move at all (e.g. a wild
// whose derived Known Moves came back empty) — this throws
// NoUsableEnemyMoveError rather than fabricating a move, falling back to
// fixed damage, or silently using Struggle (Struggle is a future phase).
export function selectEnemyMove(knownMoveIds: readonly KnownMoveId[], random: () => number = Math.random): KnownMoveId {
  if (knownMoveIds.length === 0) {
    throw new NoUsableEnemyMoveError("cannot select an enemy move: no usable Known Move is available");
  }

  const index = Math.floor(random() * knownMoveIds.length);
  return knownMoveIds[index];
}
