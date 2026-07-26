import { getMovesLearnedBetweenLevels } from "../../learnsets/index.ts";
import type { PokemonLearnset, PokemonLearnsetId } from "../../learnsets/index.ts";
import { MAX_KNOWN_MOVES } from "../../known-moves/index.ts";
import type { KnownMoveId } from "../../known-moves/index.ts";
import { validateLevelUpMoveLearningInput, isValidLevelRange, MoveLearningValidationError } from "../validation/move-learning-validation.ts";
import type { LevelLearnedMove, LevelUpMoveLearningPlan, LevelUpMoveLearningPlanResult } from "../types/move-learning.types.ts";

// Collapses the raw (possibly duplicate-by-moveId) interval entries down
// to one per move, keeping the *first* (lowest-level, then
// earliest-in-Learnset-order) occurrence — "process only its first
// eligible occurrence in canonical processing order". This is the
// opposite tiebreak from getStartingKnownMoves' dedup (which keeps the
// *most recent* occurrence): here we're walking forward through a
// Pokémon's actual level progression, so the first time it reaches a
// move is when it's learned; a later duplicate (e.g. a second
// version-group-scoped record for the same move within the same
// interval) is not a new event.
function firstOccurrencePerMove(entries: readonly LevelLearnedMove[]): LevelLearnedMove[] {
  const seen = new Set<KnownMoveId>();
  const result: LevelLearnedMove[] = [];

  for (const entry of entries) {
    if (seen.has(entry.moveId)) continue;
    seen.add(entry.moveId);
    result.push(entry);
  }

  return result;
}

// Plans (but never persists) how one owned Pokémon's Known Moves and
// Pending Move Learning decisions should change when it goes from
// oldLevel to newLevel. Pure and deterministic: same inputs always
// produce the same plan, and nothing here touches Prisma, React, or any
// other side effect — features/move-learning is what turns a plan into
// actual database writes.
//
// Level range: oldLevel is exclusive, newLevel is inclusive — a Pokémon
// that was already level 5 and dinged to level 6 should learn whatever it
// learns *at* level 6, not re-process whatever it already knew at level 5
// or earlier. newLevel === oldLevel is a valid, ordinary no-op (an empty
// interval); newLevel < oldLevel is rejected, since a Pokémon's level
// never decreases.
//
// Sequential processing: moves are walked one at a time in canonical
// order (level ascending, then Learnset declaration order for ties), and
// the projected Known Move list grows after every automatic learn — so
// whether the Nth detected move can be auto-learned depends on the
// outcome of the first N-1, not on the original (pre-plan) Known Move
// set alone. This is what makes "A,B known; C,D,E newly learned ->
// C and D auto-learn, E goes pending, final A,B,C,D" work correctly
// instead of naively checking all three against the original 2-move set.
export function planLevelUpMoveLearning(input: {
  pokemonId: PokemonLearnsetId;
  oldLevel: number;
  newLevel: number;
  currentKnownMoveIds: readonly KnownMoveId[];
  existingPendingMoveIds: readonly KnownMoveId[];
  learnset?: PokemonLearnset;
}): LevelUpMoveLearningPlanResult {
  let validated;
  try {
    validated = validateLevelUpMoveLearningInput({
      pokemonId: input.pokemonId,
      oldLevel: input.oldLevel,
      newLevel: input.newLevel,
      currentKnownMoveIds: input.currentKnownMoveIds,
      existingPendingMoveIds: input.existingPendingMoveIds,
    });
  } catch (error) {
    if (error instanceof MoveLearningValidationError) {
      return { status: "validationFailed", message: error.message };
    }
    throw error;
  }

  const { pokemonId, oldLevel, newLevel, currentKnownMoveIds, existingPendingMoveIds } = validated;

  if (!isValidLevelRange(oldLevel, newLevel)) {
    return { status: "invalidLevelRange", oldLevel, newLevel };
  }

  const rawIntervalEntries: LevelLearnedMove[] = getMovesLearnedBetweenLevels(
    pokemonId,
    oldLevel,
    newLevel,
    input.learnset
  ).map((entry) => ({
    moveId: entry.moveId,
    learnedAtLevel: entry.method.kind === "level-up" ? entry.method.level : -1,
  }));

  const detectedMoves = firstOccurrencePerMove(rawIntervalEntries);

  const projectedKnownMoveIds: KnownMoveId[] = [...currentKnownMoveIds];
  const projectedPendingMoveIds = new Set<KnownMoveId>(existingPendingMoveIds);

  const automaticallyLearnedMoveIds: KnownMoveId[] = [];
  const pendingMoves: LevelLearnedMove[] = [];
  const alreadyKnownMoveIds: KnownMoveId[] = [];
  const alreadyPendingMoveIds: KnownMoveId[] = [];

  for (const move of detectedMoves) {
    if (projectedKnownMoveIds.includes(move.moveId)) {
      alreadyKnownMoveIds.push(move.moveId);
      continue;
    }

    if (projectedPendingMoveIds.has(move.moveId)) {
      alreadyPendingMoveIds.push(move.moveId);
      continue;
    }

    if (projectedKnownMoveIds.length < MAX_KNOWN_MOVES) {
      automaticallyLearnedMoveIds.push(move.moveId);
      projectedKnownMoveIds.push(move.moveId);
    } else {
      pendingMoves.push(move);
      projectedPendingMoveIds.add(move.moveId);
    }
  }

  const plan: LevelUpMoveLearningPlan = {
    oldLevel,
    newLevel,
    detectedMoves,
    automaticallyLearnedMoveIds,
    pendingMoves,
    alreadyKnownMoveIds,
    alreadyPendingMoveIds,
    finalKnownMoveIds: projectedKnownMoveIds,
  };

  return { status: "success", plan };
}
