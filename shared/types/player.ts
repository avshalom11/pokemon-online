import type { BattlePokemon } from "./battle-pokemon";
export const MAX_ACTIVE_TEAM_SIZE = 6;

export interface Player {
  id: string;
  username: string;

  level: number;
  experience: number;

  coins: number;

  activeTeam: BattlePokemon[];
  pokemonStorage: BattlePokemon[];
}