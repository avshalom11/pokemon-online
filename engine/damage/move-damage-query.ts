import { getMoveById } from "../moves/registry/move-registry.ts";
import type { MoveId, MoveType } from "../moves/index.ts";
import { calculateMoveDamage } from "./damage-calculation.ts";
import type {
  CalculateMoveDamageResult,
  DamageDefensiveStats,
  DamageOffensiveStats,
} from "./damage-types.ts";

export class UnknownMoveError extends Error {
  constructor(moveId: string) {
    super(`no move found in the registry for id "${moveId}"`);
    this.name = "UnknownMoveError";
  }
}

export interface CalculateMoveDamageByIdInput {
  moveId: MoveId;
  level: number;
  attackerStats: DamageOffensiveStats;
  defenderStats: DamageDefensiveStats;
  randomFactor: number;
  // Phase 5C — STAB: the attacker's own types (from the Species Registry).
  // Optional, same as calculateMoveDamage's own attackerTypes field —
  // omitting it just means no STAB is applied. The move's own type
  // (moveType) is NOT a caller input here: it's always resolved from the
  // Move Registry entry itself, below, never passed in separately.
  attackerTypes?: readonly MoveType[];
  // Phase 5D — Type Effectiveness: the defender's own types (also from the
  // Species Registry). Optional, same convention — omitting it just means
  // no effectiveness multiplier (neutral 1x) is applied.
  defenderTypes?: readonly MoveType[];
  // Phase 5E — Accuracy: a single pre-rolled integer in [0, 99] from
  // rollAccuracyCheck() (random.ts). The move's own accuracy (accuracy) is
  // NOT a caller input here: it's always resolved from the Move Registry
  // entry itself, below, never passed in separately — same convention as
  // moveType. Omitting accuracyRoll means "cannot evaluate the check,"
  // which resolves to an automatic hit (see checkMoveAccuracy's own doc
  // comment in accuracy.ts).
  accuracyRoll?: number;
  // Phase 5F — Critical Hit: a single pre-rolled float in [0, 1) from
  // rollCriticalHit() (random.ts). There is no per-move registry data for
  // this (one global CRITICAL_HIT_CHANCE — see critical.ts). Omitting it
  // means "no critical check requested," which resolves to never critical.
  criticalRoll?: number;
}

// Thin adapter between the current Move Registry and the pure formula:
// resolves a moveId's category, power, and type and maps them into
// CalculateMoveDamageInput. Registry lookup is kept out of
// calculateMoveDamage itself so the formula can be unit-tested against
// plain fixture data without depending on the real move catalog.
export function calculateMoveDamageById(input: CalculateMoveDamageByIdInput): CalculateMoveDamageResult {
  const move = getMoveById(input.moveId);

  if (!move) {
    throw new UnknownMoveError(input.moveId);
  }

  return calculateMoveDamage({
    level: input.level,
    moveCategory: move.category,
    movePower: move.power,
    moveType: move.type,
    attackerTypes: input.attackerTypes,
    defenderTypes: input.defenderTypes,
    attackerStats: input.attackerStats,
    defenderStats: input.defenderStats,
    randomFactor: input.randomFactor,
    accuracy: move.accuracy,
    accuracyRoll: input.accuracyRoll,
    criticalRoll: input.criticalRoll,
  });
}
