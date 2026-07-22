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

  // National Pokédex number. The single source used to derive every media
  // asset path (sprites, icons, artwork) — see
  // features/pokemon/media/pokemon-media-paths.ts.
  dexNumber: number;

  types: PokemonType[];
  rarity: PokemonRarity;

  baseStats: PokemonBaseStats;

  imageUrl: string;

  // Whether this species can be chosen as a first Pokémon during onboarding.
  isStarter?: boolean;
}