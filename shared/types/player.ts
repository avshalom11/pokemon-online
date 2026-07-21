import type { PlayerPokemon } from "./player-pokemon";
export const MAX_ACTIVE_TEAM_SIZE = 6;

export interface Player {
  id: string;
  username: string;

  level: number;
  experience: number;

  coins: number;

  activeTeam: PlayerPokemon[];
  pokemonStorage: PlayerPokemon[];
}