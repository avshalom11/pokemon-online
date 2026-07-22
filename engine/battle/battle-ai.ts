import { MOVE_DATA } from "@/data/moves/move-data";
import type { Move } from "@/shared/types/move";

export function chooseOpponentMove(
  availableMoveIds: string[],
  currentMoveUses: Record<string, number>
): Move {
  const availableMoves = availableMoveIds
    .map((moveId) => MOVE_DATA.find((move) => move.id === moveId))
    .filter((move): move is Move => move !== undefined);

  if (availableMoves.length === 0) {
    throw new Error("Opponent has no available moves");
  }

  const usableMoves = availableMoves.filter(
    (move) => (currentMoveUses[move.id] ?? move.maxUses) > 0
  );

  const movePool = usableMoves.length > 0 ? usableMoves : availableMoves;

  const randomIndex = Math.floor(Math.random() * movePool.length);

  return movePool[randomIndex];
}
