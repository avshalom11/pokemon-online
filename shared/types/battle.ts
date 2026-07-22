import type { BattlePokemon } from "./battle-pokemon";

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
  pokemon: BattlePokemon;
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

export interface BattleActionOutcome {
  actor: BattleTurnOwner;

  moveId: string;
  moveName: string;

  didHit: boolean;
  damageDealt: number;
  isCritical: boolean;
  effectivenessMultiplier: number;

  targetFainted: boolean;
}

export interface BattleTurnResult {
  battle: Battle;
  actions: BattleActionOutcome[];
}