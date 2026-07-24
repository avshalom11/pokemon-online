// Hebrew wording for player-XP/level-up feedback. Deliberately short — this
// text drives a brief, non-blocking toast (features/battle/components/XpToast.tsx)
// and the notification bell (features/notifications/), never the battle
// message box: the battle loop must never wait on reading these, so the
// wording itself stays terse by design, not just the display duration.

export function playerXpToastMessage(xpGained: number): string {
  return `קיבלת ${xpGained} XP`;
}

// Also the wording for the PLAYER_LEVEL_UP notification (see
// features/notifications/services/notification-service.ts's
// createLevelUpNotification) — one source of truth for this sentence either
// way it's shown.
export function playerLevelUpMessage(newLevel: number): string {
  return `עלית לרמת שחקן ${newLevel}!`;
}
