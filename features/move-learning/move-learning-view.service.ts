import "server-only";

import { getMoveById } from "@/engine/moves";
import { getKnownMoves } from "@/features/known-moves/known-moves-queries";
import { getNextPendingMove } from "@/features/move-learning/move-learning-queries";

export interface PendingMoveLearningViewSlot {
  slot: number;
  moveId: string;
  moveName: string;
}

export interface PendingMoveLearningViewPending {
  id: string;
  moveId: string;
  moveName: string;
  learnedAtLevel: number;
}

export interface PendingMoveLearningView {
  knownMoves: PendingMoveLearningViewSlot[];
  nextPending: PendingMoveLearningViewPending | null;
}

// Assembles exactly what the "learn or decline a pending move" UI needs
// for one owned Pokémon: its current Known Moves in slot order (so the
// player can pick which one to replace) and the single next unresolved
// Pending Move decision, if any — never more than one at a time (Phase 4E:
// "Always resolve them in creation order"). Move names are resolved from
// the static move registry, never stored redundantly.
export async function getPendingMoveLearningView(playerPokemonId: string): Promise<PendingMoveLearningView> {
  const [knownMoves, nextPending] = await Promise.all([
    getKnownMoves(playerPokemonId),
    getNextPendingMove(playerPokemonId),
  ]);

  return {
    knownMoves: knownMoves
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((move) => ({
        slot: move.slot,
        moveId: move.moveId,
        moveName: getMoveById(move.moveId)?.name ?? move.moveId,
      })),
    nextPending: nextPending
      ? {
          id: nextPending.id,
          moveId: nextPending.moveId,
          moveName: getMoveById(nextPending.moveId)?.name ?? nextPending.moveId,
          learnedAtLevel: nextPending.learnedAtLevel,
        }
      : null,
  };
}
