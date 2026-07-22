import type { PokemonBaseStats } from "@/shared/types/pokemon";

export interface BattleStats {
  health: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

const HEALTH_GROWTH_PER_LEVEL = 2;
const OTHER_STAT_GROWTH_PER_LEVEL = 0.5;

export function calculateBattleStats(
  baseStats: PokemonBaseStats,
  level: number
): BattleStats {
  return {
    health: baseStats.health + level * HEALTH_GROWTH_PER_LEVEL,
    attack:
      baseStats.attack +
      Math.floor(level * OTHER_STAT_GROWTH_PER_LEVEL),
    defense:
      baseStats.defense +
      Math.floor(level * OTHER_STAT_GROWTH_PER_LEVEL),
    specialAttack:
      baseStats.specialAttack +
      Math.floor(level * OTHER_STAT_GROWTH_PER_LEVEL),
    specialDefense:
      baseStats.specialDefense +
      Math.floor(level * OTHER_STAT_GROWTH_PER_LEVEL),
    speed:
      baseStats.speed +
      Math.floor(level * OTHER_STAT_GROWTH_PER_LEVEL),
  };
}
