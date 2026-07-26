import { ALL_MOVE_DEFINITIONS } from "../data/index.ts";
import type { Move, MoveId } from "../types/move.types.ts";
import { validateMoveList } from "../validation/move-validation.ts";

// Builds a lookup map from an already-validated move list. Exposed
// separately from the module-level singleton below so tests can build a
// registry from fixture data without touching the real generation data
// folders.
export function buildMoveRegistry(moves: readonly Move[]): Map<MoveId, Move> {
  const registry = new Map<MoveId, Move>();

  for (const move of moves) {
    registry.set(move.id, move);
  }

  return registry;
}

// Single source of truth for move data: validated once at module load, then
// looked up from an in-memory map. Every consumer (learnsets, the damage
// engine, UI) goes through the helpers below instead of importing
// generation data folders directly.
const VALIDATED_MOVES = validateMoveList(ALL_MOVE_DEFINITIONS);
const MOVE_REGISTRY = buildMoveRegistry(VALIDATED_MOVES);

export function getAllMoves(): readonly Move[] {
  return VALIDATED_MOVES;
}

export function getMoveById(id: MoveId): Move | undefined {
  return MOVE_REGISTRY.get(id);
}
