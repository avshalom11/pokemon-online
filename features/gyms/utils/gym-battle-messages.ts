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

// GYM BATTLE COPY + ITEM EFFECT DISPLAY (later task) — Easy/Medium victory
// copy only (the ONE caller, GymEasyMediumVictoryNotice in
// GymBattleContent.tsx); Gym Leader/Regional Champion victories never call
// this — their own copy lives entirely in GymVictoryRewardDialog.tsx and is
// untouched by this change.
export function npcTeamDefeatedMessage(): string {
  return "ניצחת את כל הפוקימונים של היריב!";
}
