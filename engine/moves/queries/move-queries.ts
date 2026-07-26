import { getAllMoves } from "../registry/move-registry.ts";
import type {
  ImplementationStatus,
  Move,
  MoveCategory,
  MoveFlag,
  MoveType,
} from "../types/move.types.ts";

// Higher-level filtering helpers built on top of the registry's raw
// getAllMoves()/getMoveById(). Each one is a simple, composable, one-purpose
// query — combine them (e.g. filter the result of getMovesByType again) for
// anything more specific instead of adding a bespoke helper per
// combination.
//
// Each helper accepts an optional `moves` list (defaulting to the real
// registry's getAllMoves()) so they can be exercised against fixture data
// in tests without depending on populated generation data.

export function getMovesByGeneration(generation: number, moves: readonly Move[] = getAllMoves()): Move[] {
  return moves.filter((move) => move.generation === generation);
}

export function getMovesByType(type: MoveType, moves: readonly Move[] = getAllMoves()): Move[] {
  return moves.filter((move) => move.type === type);
}

export function getMovesByCategory(category: MoveCategory, moves: readonly Move[] = getAllMoves()): Move[] {
  return moves.filter((move) => move.category === category);
}

export function getMovesByFlag(flag: MoveFlag, moves: readonly Move[] = getAllMoves()): Move[] {
  return moves.filter((move) => move.flags.includes(flag));
}

export function getMovesByImplementationStatus(
  status: ImplementationStatus,
  moves: readonly Move[] = getAllMoves()
): Move[] {
  return moves.filter((move) => move.implementationStatus === status);
}
