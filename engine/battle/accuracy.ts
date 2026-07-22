import type { Move } from "@/shared/types/move";

export function didMoveHit(move: Move): boolean {
  return Math.random() * 100 < move.accuracy;
}
