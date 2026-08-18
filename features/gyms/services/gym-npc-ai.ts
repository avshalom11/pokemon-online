import { getMoveById } from "@/engine/moves";
import { selectEnemyMove } from "@/features/battle/ai/select-enemy-move";
import type { GymDifficulty } from "../types/gym.types";

// GYMS & LEAGUES PHASE 3 — minimal difficulty-aware move selection (section
// 10: "do NOT build a huge AI system now... create a small generic
// interface/config that can be improved later"). No difficulty-aware AI
// abstraction existed anywhere in the project before this — Field Battle's
// own selectEnemyMove (features/battle/ai/select-enemy-move.ts) is uniform-
// random with no concept of difficulty at all.
//
// Behavior by difficulty (all still resolved through the exact same Move
// Registry/damage engine — no separate move list, no duplicated damage
// math):
//   easy:      uniform-random among usable moves — IDENTICAL to Field
//              Battle's own selectEnemyMove, reused directly.
//   medium:    50% chance to pick the single highest-power usable damaging
//              move outright; otherwise uniform-random (same as easy).
//   hard:      80% chance of the same "pick the best move" behavior.
//   very-hard: always picks the best available move when one exists.
// This is a bias toward raw move power only — no type-effectiveness/STAB
// lookahead, no multi-turn planning. Correctness (a legal, usable move is
// always returned) over sophistication, per this Phase's own instruction.
const STRONG_MOVE_BIAS: Record<GymDifficulty, number> = {
  easy: 0,
  medium: 0.5,
  hard: 0.8,
  "very-hard": 1,
};

function highestPowerDamagingMoveId(usableMoveIds: readonly string[]): string | null {
  let best: { id: string; power: number } | null = null;

  for (const id of usableMoveIds) {
    const move = getMoveById(id);
    if (!move || move.power == null) continue;
    if (!best || move.power > best.power) best = { id, power: move.power };
  }

  return best?.id ?? null;
}

// The one entry point Gym/Regional Champion battles use to pick the NPC's
// move each turn — never Field Battle's own selectEnemyMove directly, so a
// future difficulty rebalance never risks touching wild-encounter behavior.
export function selectNpcMoveForDifficulty(usableMoveIds: readonly string[], difficulty: GymDifficulty, randomSource?: () => number): string {
  const bias = STRONG_MOVE_BIAS[difficulty];
  const roll = randomSource ? randomSource() : Math.random();

  if (bias > 0 && roll < bias) {
    const best = highestPowerDamagingMoveId(usableMoveIds);
    if (best) return best;
  }

  return selectEnemyMove(usableMoveIds, randomSource);
}
