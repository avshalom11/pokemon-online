import { TYPE_CHART } from "@/data/battle/type-chart";
import type { PokemonType } from "@/shared/types/pokemon";

export function getTypeEffectivenessMultiplier(
  attackType: PokemonType,
  defenderTypes: PokemonType[]
): number {
  const matchups = TYPE_CHART[attackType];

  return defenderTypes.reduce((multiplier, defenderType) => {
    if (matchups.noEffectAgainst.includes(defenderType)) {
      return 0;
    }

    if (matchups.superEffectiveAgainst.includes(defenderType)) {
      return multiplier * 2;
    }

    if (matchups.notEffectiveAgainst.includes(defenderType)) {
      return multiplier * 0.5;
    }

    return multiplier;
  }, 1);
}
