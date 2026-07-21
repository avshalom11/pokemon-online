export type PokemonType =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

export type PokemonRarity =
  | "common"
  | "rare"
  | "very-rare"
  | "legendary";

export interface PokemonBaseStats {
  health: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface PokemonSpecies {
  id: string;
  name: string;
  description: string;

  types: PokemonType[];
  rarity: PokemonRarity;

  baseStats: PokemonBaseStats;

  imageUrl: string;
}