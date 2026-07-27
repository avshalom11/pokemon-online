import { DamageValidationError } from "./damage-errors.ts";

// Phase 5E — the accuracy/miss gate for the Damage Engine. Deliberately
// independent of the pre-existing, disconnected engine/battle/accuracy.ts,
// which is used only by the old, unwired engine/battle/damage-calculation.ts
// (same rule every earlier Phase 5 sub-phase already established for
// battle-engine.ts/battle-ai.ts/turn-order.ts/type-effectiveness.ts/
// data/battle/type-chart.ts/data/moves/move-data.ts).
//
// A move's accuracy (from the current Move Registry's own `accuracy` field)
// is either an integer 1-100, or `null` for a move that always hits (e.g.
// Swift, Bide, Struggle — real Move Registry data, not a guess). Given that
// accuracy plus a single pre-rolled integer "accuracyRoll" in [0, 99] (see
// rollAccuracyCheck in random.ts), checkMoveAccuracy below is a pure
// hit/miss decision: hit whenever accuracyRoll < accuracy, so accuracy 100
// always hits (every possible roll 0-99 is < 100) and accuracy 0 always
// misses (no roll is ever < 0).

export const MIN_ACCURACY = 0;
export const MAX_ACCURACY = 100;
export const MIN_ACCURACY_ROLL = 0;
export const MAX_ACCURACY_ROLL = 99;

export type AccuracyCheckResult =
  | { hit: true; accuracy: number | null; accuracyRoll: number | null }
  | { hit: false; accuracy: number; accuracyRoll: number };

function validateAccuracy(accuracy: number): void {
  if (!Number.isInteger(accuracy) || accuracy < MIN_ACCURACY || accuracy > MAX_ACCURACY) {
    throw new DamageValidationError(`accuracy must be an integer between ${MIN_ACCURACY} and ${MAX_ACCURACY}, got ${accuracy}`);
  }
}

function validateAccuracyRoll(accuracyRoll: number): void {
  if (!Number.isInteger(accuracyRoll) || accuracyRoll < MIN_ACCURACY_ROLL || accuracyRoll > MAX_ACCURACY_ROLL) {
    throw new DamageValidationError(
      `accuracyRoll must be an integer between ${MIN_ACCURACY_ROLL} and ${MAX_ACCURACY_ROLL}, got ${accuracyRoll}`
    );
  }
}

// accuracy === undefined: no Phase 5E data was supplied at all (every
// pre-Phase-5E caller/input literal) — resolves to an automatic hit, the
// same "missing data means no-op" convention Phase 5C/5D already use for
// moveType/attackerTypes/defenderTypes, so every existing caller keeps
// compiling and behaving exactly as before.
//
// accuracy === null: the move's own Move Registry accuracy is genuinely
// null (Swift/Bide/Struggle) — it always hits by definition, and never
// consumes a roll.
//
// accuracy is a number but accuracyRoll is undefined: the caller knows the
// move's accuracy but hasn't supplied a paired roll to evaluate it against.
// The engine never calls Math.random itself (see random.ts's own doc
// comment), so — exactly like a missing moveType/attackerTypes pairing for
// STAB — this cannot be resolved and defaults to an automatic hit rather
// than throwing; real gameplay (battle-damage-rules.ts/battle-action.
// service.ts) always supplies both together, so this path is only ever
// exercised by an older/simpler caller intentionally opting out of the
// check.
//
// A numeric accuracy value that is out of range, or a roll outside its
// valid range, both fail loudly (DamageValidationError) rather than
// silently assuming 100/a hit — bad data must never be guessed at.
export function checkMoveAccuracy(accuracy: number | null | undefined, accuracyRoll: number | undefined): AccuracyCheckResult {
  if (accuracy === undefined || accuracy === null) {
    return { hit: true, accuracy: null, accuracyRoll: null };
  }

  validateAccuracy(accuracy);

  if (accuracyRoll === undefined) {
    return { hit: true, accuracy: null, accuracyRoll: null };
  }

  validateAccuracyRoll(accuracyRoll);

  return accuracyRoll < accuracy
    ? { hit: true, accuracy, accuracyRoll }
    : { hit: false, accuracy, accuracyRoll };
}
