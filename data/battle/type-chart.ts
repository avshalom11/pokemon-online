import type { PokemonType } from "@/shared/types/pokemon";

export interface TypeMatchups {
  superEffectiveAgainst: PokemonType[];
  notEffectiveAgainst: PokemonType[];
  noEffectAgainst: PokemonType[];
}

export const TYPE_CHART: Record<PokemonType, TypeMatchups> = {
  normal: {
    superEffectiveAgainst: [],
    notEffectiveAgainst: ["rock", "steel"],
    noEffectAgainst: ["ghost"],
  },
  fire: {
    superEffectiveAgainst: ["grass", "ice", "bug", "steel"],
    notEffectiveAgainst: ["fire", "water", "rock", "dragon"],
    noEffectAgainst: [],
  },
  water: {
    superEffectiveAgainst: ["fire", "ground", "rock"],
    notEffectiveAgainst: ["water", "grass", "dragon"],
    noEffectAgainst: [],
  },
  electric: {
    superEffectiveAgainst: ["water", "flying"],
    notEffectiveAgainst: ["electric", "grass", "dragon"],
    noEffectAgainst: ["ground"],
  },
  grass: {
    superEffectiveAgainst: ["water", "ground", "rock"],
    notEffectiveAgainst: [
      "fire",
      "grass",
      "poison",
      "flying",
      "bug",
      "dragon",
      "steel",
    ],
    noEffectAgainst: [],
  },
  ice: {
    superEffectiveAgainst: ["grass", "ground", "flying", "dragon"],
    notEffectiveAgainst: ["fire", "water", "ice", "steel"],
    noEffectAgainst: [],
  },
  fighting: {
    superEffectiveAgainst: ["normal", "ice", "rock", "dark", "steel"],
    notEffectiveAgainst: ["poison", "flying", "psychic", "bug", "fairy"],
    noEffectAgainst: ["ghost"],
  },
  poison: {
    superEffectiveAgainst: ["grass", "fairy"],
    notEffectiveAgainst: ["poison", "ground", "rock", "ghost"],
    noEffectAgainst: ["steel"],
  },
  ground: {
    superEffectiveAgainst: ["fire", "electric", "poison", "rock", "steel"],
    notEffectiveAgainst: ["grass", "bug"],
    noEffectAgainst: ["flying"],
  },
  flying: {
    superEffectiveAgainst: ["grass", "fighting", "bug"],
    notEffectiveAgainst: ["electric", "rock", "steel"],
    noEffectAgainst: [],
  },
  psychic: {
    superEffectiveAgainst: ["fighting", "poison"],
    notEffectiveAgainst: ["psychic", "steel"],
    noEffectAgainst: ["dark"],
  },
  bug: {
    superEffectiveAgainst: ["grass", "psychic", "dark"],
    notEffectiveAgainst: [
      "fire",
      "fighting",
      "poison",
      "flying",
      "ghost",
      "steel",
      "fairy",
    ],
    noEffectAgainst: [],
  },
  rock: {
    superEffectiveAgainst: ["fire", "ice", "flying", "bug"],
    notEffectiveAgainst: ["fighting", "ground", "steel"],
    noEffectAgainst: [],
  },
  ghost: {
    superEffectiveAgainst: ["psychic", "ghost"],
    notEffectiveAgainst: ["dark"],
    noEffectAgainst: ["normal"],
  },
  dragon: {
    superEffectiveAgainst: ["dragon"],
    notEffectiveAgainst: ["steel"],
    noEffectAgainst: ["fairy"],
  },
  dark: {
    superEffectiveAgainst: ["psychic", "ghost"],
    notEffectiveAgainst: ["fighting", "dark", "fairy"],
    noEffectAgainst: [],
  },
  steel: {
    superEffectiveAgainst: ["ice", "rock", "fairy"],
    notEffectiveAgainst: ["steel", "fire", "water", "electric"],
    noEffectAgainst: [],
  },
  fairy: {
    superEffectiveAgainst: ["fighting", "dragon", "dark"],
    notEffectiveAgainst: ["fire", "poison", "steel"],
    noEffectAgainst: [],
  },
};
