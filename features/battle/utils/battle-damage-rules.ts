import { calculatePokemonStats } from "@/engine/battle/pokemon-stat-calculations";
import { calculateMoveDamage, type CalculateMoveDamageResult } from "@/engine/damage";
import type { Move } from "@/engine/moves";
import type { PokemonBaseStats, PokemonType } from "@/shared/types/pokemon";

// Phase 5B.2 — pure glue between the centralized Pokémon stat system
// (engine/battle/pokemon-stat-calculations.ts) and the Phase 5B.1 Damage
// Engine (engine/damage). Phase 5C added STAB; Phase 5D added Type
// Effectiveness. No DB, no Move Registry or Species Registry lookup (the
// caller already resolved `move` via getMoveById and both battlers' own
// `types` via the Species Registry) — kept separate from
// battle-action.service.ts so the actual damage math is testable without
// the fake-Prisma DB harness every persistence test needs.

// Both the attacker and the defender carry their own species types now:
// the attacker's for STAB (Phase 5C), the defender's for Type
// Effectiveness (Phase 5D) — a single shared shape since every real
// battler always has both stats and types together.
export interface DamageBattler {
  baseStats: PokemonBaseStats;
  level: number;
  types: readonly PokemonType[];
}

// Attacker/defender stats are derived here via calculatePokemonStats — the
// same centralized formula every other stat consumer uses — never
// recomputed by hand and never read from a persisted column.
export function resolveAttackDamage(
  move: Move,
  attacker: DamageBattler,
  defender: DamageBattler,
  randomFactor: number
): CalculateMoveDamageResult {
  return calculateMoveDamage({
    level: attacker.level,
    moveCategory: move.category,
    movePower: move.power,
    moveType: move.type,
    attackerTypes: attacker.types,
    defenderTypes: defender.types,
    attackerStats: calculatePokemonStats({ baseStats: attacker.baseStats, level: attacker.level }),
    defenderStats: calculatePokemonStats({ baseStats: defender.baseStats, level: defender.level }),
    randomFactor,
  });
}
