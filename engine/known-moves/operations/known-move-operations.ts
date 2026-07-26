import { getMoveById } from "../../moves/index.ts";
import { MAX_KNOWN_MOVES, MIN_KNOWN_MOVE_SLOT, MAX_KNOWN_MOVE_SLOT } from "../constants.ts";
import { validateKnownMoveSet, KnownMoveValidationError } from "../validation/known-move-validation.ts";
import type { KnownMoveId, KnownMoveOperationResult, KnownMoveSet } from "../types/known-move.types.ts";

// Pure, in-memory operations on a KnownMoveSet. None of these touch
// Prisma or any owned-Pokémon id — the persistence layer in
// features/known-moves reads a set for one PlayerPokemon, applies one of
// these, and writes the resulting set back inside a transaction. Keeping
// the actual slot/duplicate/full rules here means that transaction layer
// never has to re-derive them, and these rules can be unit-tested without
// a database.

function success(knownMoves: KnownMoveSet): KnownMoveOperationResult {
  return { status: "success", knownMoves };
}

function isValidSlotNumber(slot: number): boolean {
  return Number.isInteger(slot) && slot >= MIN_KNOWN_MOVE_SLOT && slot <= MAX_KNOWN_MOVE_SLOT;
}

// Rebuilds a fresh, compact set from an ordered list of move ids (slot =
// array position + 1). This is both the pure counterpart of the
// persistence layer's `setKnownMoves` (a full replace) and the shared
// helper used to seed a newly created owned Pokémon's starting moves.
export function buildKnownMoveSet(moveIds: readonly KnownMoveId[]): KnownMoveOperationResult {
  if (moveIds.length > MAX_KNOWN_MOVES) {
    return { status: "moveSetFull" };
  }

  const uniqueMoveIds = new Set(moveIds);
  if (uniqueMoveIds.size !== moveIds.length) {
    return { status: "validationFailed", message: "move set contains a duplicate moveId" };
  }

  const candidate: KnownMoveSet = moveIds.map((moveId, index) => ({ moveId, slot: index + 1 }));

  try {
    return success(validateKnownMoveSet(candidate));
  } catch (error) {
    if (error instanceof KnownMoveValidationError) {
      return { status: "validationFailed", message: error.message };
    }
    throw error;
  }
}

// Appends `moveId` to the next open slot. Fails if the move is already
// known, if the set is already full, or if the move doesn't exist.
export function addKnownMove(knownMoves: KnownMoveSet, moveId: KnownMoveId): KnownMoveOperationResult {
  if (getMoveById(moveId) === undefined) {
    return { status: "moveNotFound", moveId };
  }
  if (knownMoves.some((move) => move.moveId === moveId)) {
    return { status: "moveAlreadyKnown", moveId };
  }
  if (knownMoves.length >= MAX_KNOWN_MOVES) {
    return { status: "moveSetFull" };
  }

  const nextSlot = knownMoves.length + 1;
  return success([...knownMoves, { moveId, slot: nextSlot }]);
}

// Swaps whatever move occupies `slot` for `newMoveId`, preserving the
// slot number itself. Fails if the slot is out of range, if the slot
// isn't currently occupied, if the new move doesn't exist, or if the new
// move is already known in a different slot.
export function replaceKnownMove(
  knownMoves: KnownMoveSet,
  slot: number,
  newMoveId: KnownMoveId
): KnownMoveOperationResult {
  if (!isValidSlotNumber(slot)) {
    return { status: "invalidSlot", slot };
  }

  const current = knownMoves.find((move) => move.slot === slot);
  if (!current) {
    return { status: "moveNotKnown", slot };
  }

  if (getMoveById(newMoveId) === undefined) {
    return { status: "moveNotFound", moveId: newMoveId };
  }

  const knownElsewhere = knownMoves.some((move) => move.moveId === newMoveId && move.slot !== slot);
  if (knownElsewhere) {
    return { status: "moveAlreadyKnown", moveId: newMoveId };
  }

  return success(knownMoves.map((move) => (move.slot === slot ? { moveId: newMoveId, slot } : move)));
}

// Removes whatever move occupies `slot` and compacts every later slot
// forward by one, so the set stays contiguous (1..N) as
// knownMoveSetSchema requires. Fails if the slot is out of range or isn't
// currently occupied.
export function removeKnownMove(knownMoves: KnownMoveSet, slot: number): KnownMoveOperationResult {
  if (!isValidSlotNumber(slot)) {
    return { status: "invalidSlot", slot };
  }

  const current = knownMoves.find((move) => move.slot === slot);
  if (!current) {
    return { status: "moveNotKnown", slot };
  }

  const remaining = getKnownMoveIdsInSlotOrder(knownMoves).filter((moveId) => moveId !== current.moveId);
  return buildKnownMoveSet(remaining);
}

// Reassigns slots 1..N to match `orderedMoveIds` exactly. The provided
// list must contain precisely the move ids already known — same
// membership, any order — never a different set of moves; use
// add/replace/remove to change *which* moves are known.
export function reorderKnownMoves(
  knownMoves: KnownMoveSet,
  orderedMoveIds: readonly KnownMoveId[]
): KnownMoveOperationResult {
  const currentIds = new Set(knownMoves.map((move) => move.moveId));
  const requestedIds = new Set(orderedMoveIds);

  if (orderedMoveIds.length !== new Set(orderedMoveIds).size) {
    return { status: "invalidReorder", reason: "the reorder list contains a duplicate moveId" };
  }
  if (requestedIds.size !== currentIds.size) {
    return {
      status: "invalidReorder",
      reason: `expected ${currentIds.size} move id(s), received ${requestedIds.size}`,
    };
  }
  for (const moveId of orderedMoveIds) {
    if (!currentIds.has(moveId)) {
      return { status: "invalidReorder", reason: `"${moveId}" is not currently known` };
    }
  }

  return buildKnownMoveSet(orderedMoveIds);
}

function getKnownMoveIdsInSlotOrder(knownMoves: KnownMoveSet): KnownMoveId[] {
  return [...knownMoves].sort((a, b) => a.slot - b.slot).map((move) => move.moveId);
}
