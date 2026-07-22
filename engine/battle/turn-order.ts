import type { Move } from "@/shared/types/move";
import type { BattleTurnOwner } from "@/shared/types/battle";

export function determineFirstMover(params: {
  playerMove: Move;
  playerSpeed: number;
  opponentMove: Move;
  opponentSpeed: number;
}): BattleTurnOwner {
  const { playerMove, playerSpeed, opponentMove, opponentSpeed } = params;

  if (playerMove.priority !== opponentMove.priority) {
    return playerMove.priority > opponentMove.priority
      ? "player"
      : "opponent";
  }

  if (playerSpeed !== opponentSpeed) {
    return playerSpeed > opponentSpeed ? "player" : "opponent";
  }

  return Math.random() < 0.5 ? "player" : "opponent";
}
