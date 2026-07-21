import type { PlayerPokemon } from "./player-pokemon";

export type BattleStatus =
  | "waiting"
  | "active"
  | "won"
  | "lost"
  | "escaped";

export type BattleTurnOwner =
  | "player"
  | "opponent";

export interface BattleParticipant {
  pokemon: PlayerPokemon;
  currentHealth: number;
  currentMoveUses: Record<string, number>;
}

export interface Battle {
  id: string;

  player: BattleParticipant;
  opponent: BattleParticipant;

  currentTurn: BattleTurnOwner;
  turnNumber: number;

  status: BattleStatus;
}