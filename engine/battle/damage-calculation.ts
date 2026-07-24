import { getTypeEffectivenessMultiplier } from "./type-effectiveness";
import type { PokemonStats } from "./pokemon-stat-calculations";
import type { Move } from "@/shared/types/move";
import type { PokemonType } from "@/shared/types/pokemon";

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  effectivenessMultiplier: number;
}

const CRITICAL_HIT_CHANCE = 1 / 16;
const CRITICAL_HIT_MULTIPLIER = 1.5;
const MINIMUM_RANDOM_FACTOR = 0.85;
const MAXIMUM_RANDOM_FACTOR = 1;

export function calculateDamage(params: {
  attackerLevel: number;
  attackerStats: PokemonStats;
  defenderStats: PokemonStats;
  defenderTypes: PokemonType[];
  move: Move;
}): DamageResult {
  const {
    attackerLevel,
    attackerStats,
    defenderStats,
    defenderTypes,
    move,
  } = params;

  const effectivenessMultiplier = getTypeEffectivenessMultiplier(
    move.type,
    defenderTypes
  );

  if (move.power === null || effectivenessMultiplier === 0) {
    return {
      damage: 0,
      isCritical: false,
      effectivenessMultiplier,
    };
  }

  const isCritical = Math.random() < CRITICAL_HIT_CHANCE;

  const attackStat =
    move.category === "physical"
      ? attackerStats.attack
      : attackerStats.specialAttack;

  const defenseStat =
    move.category === "physical"
      ? defenderStats.defense
      : defenderStats.specialDefense;

  const baseDamage =
    (((2 * attackerLevel) / 5 + 2) * move.power * (attackStat / defenseStat)) /
      50 +
    2;

  const randomFactor =
    MINIMUM_RANDOM_FACTOR +
    Math.random() * (MAXIMUM_RANDOM_FACTOR - MINIMUM_RANDOM_FACTOR);

  const criticalMultiplier = isCritical ? CRITICAL_HIT_MULTIPLIER : 1;

  const damage = Math.max(
    1,
    Math.floor(
      baseDamage * effectivenessMultiplier * criticalMultiplier * randomFactor
    )
  );

  return {
    damage,
    isCritical,
    effectivenessMultiplier,
  };
}
