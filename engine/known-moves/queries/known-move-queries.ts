import { getMoveById } from "../../moves/index.ts";
import type { Move } from "../../moves/index.ts";
import { MAX_KNOWN_MOVES } from "../constants.ts";
import type { KnownMoveId, KnownMoveSet } from "../types/known-move.types.ts";

// Pure, reusable queries over an in-memory KnownMoveSet — no Prisma, no
// React, no browser APIs. The Prisma-backed equivalents in
// features/known-moves read a set from the database and then call these,
// so the actual slot/full/available-slot logic exists exactly once.

// Move ids in slot order (1, 2, 3, 4, skipping any missing slot — though a
// valid KnownMoveSet is always contiguous, see knownMoveSetSchema).
export function getKnownMoveIds(knownMoves: KnownMoveSet): KnownMoveId[] {
  return [...knownMoves].sort((a, b) => a.slot - b.slot).map((move) => move.moveId);
}

// Fully resolved Move data (name, type, power, ...) in slot order, read
// from the static move registry — never fetched from persistence, since
// Moves are static game data (engine/moves), not per-owned-Pokémon state.
// A move id that somehow doesn't resolve (should be impossible for an
// already-validated set) is skipped rather than throwing, so a read query
// never crashes a page.
export function getResolvedKnownMoves(knownMoves: KnownMoveSet): Move[] {
  return getKnownMoveIds(knownMoves)
    .map((moveId) => getMoveById(moveId))
    .filter((move): move is Move => move !== undefined);
}

export function isMoveKnown(knownMoves: KnownMoveSet, moveId: KnownMoveId): boolean {
  return knownMoves.some((move) => move.moveId === moveId);
}

export function getKnownMoveCount(knownMoves: KnownMoveSet): number {
  return knownMoves.length;
}

export function isKnownMoveSetFull(knownMoves: KnownMoveSet): boolean {
  return knownMoves.length >= MAX_KNOWN_MOVES;
}

export function hasAvailableKnownMoveSlot(knownMoves: KnownMoveSet): boolean {
  return !isKnownMoveSetFull(knownMoves);
}
