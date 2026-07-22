export interface BattleParticipantDisplay {
  name: string;
  level: number;
  currentHealth: number;
  maxHealth: number;
}

export interface PlayerBattleParticipantDisplay extends BattleParticipantDisplay {
  currentExperience: number;
  maxExperience: number;
}

export interface BattleMenuAction {
  id: string;
  label: string;
}

export interface BattleAttackSlot {
  id: string;
  name: string;
}
