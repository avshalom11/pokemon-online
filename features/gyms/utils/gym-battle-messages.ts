// GYMS & LEAGUES PHASE 4 — Gym-battle-specific message-box wording, kept
// separate from features/battle/utils/battle-messages.ts's own Field-Battle
// wording (that module's own attackMessage/faintedMessage/
// forcedReplacementMessage/partyDefeatedMessage are already generic enough
// to be reused as-is by GymBattleContent — this file only adds the couple
// of messages that ARE NPC-battle-specific, e.g. "a wild Pokémon appeared"
// makes no sense for a trainer's own Pokémon).

export function npcSentOutMessage(npcName: string): string {
  return `היריב שלח את ${npcName}!`;
}

export function npcTeamDefeatedMessage(): string {
  return "ניצחת את כל היריבים!";
}
