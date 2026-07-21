import type { PokemonSpecies } from "./pokemon";

export interface PlayerPokemon {
  id: string;

  species: PokemonSpecies;

  nickname?: string;

  level: number;
  experience: number;

  currentHealth: number;

  isShiny: boolean;

  moveIds: string[];
}