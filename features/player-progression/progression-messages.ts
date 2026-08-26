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

// PLAYER LEVEL UP — CONGRATULATIONS DIALOG (features/player/components/
// PlayerLevelUpDialog.tsx). Deliberately its own, richer copy — a short,
// blocking congratulations moment — rather than reusing playerLevelUpMessage
// above verbatim: that one stays the terse notification-bell/toast line,
// this one is the one-time "you leveled up" confirmation. Both are always
// derived from the exact same server-authoritative newLevel value, never a
// second computation of it.
export const playerLevelUpDialogTitle = "כל הכבוד!";

export function playerLevelUpDialogMessage(newLevel: number): string {
  return `עבדת קשה ועלית לרמה ${newLevel}!`;
}

export const playerLevelUpDialogButtonLabel = "אישור";

// PLAYER LEVEL-UP REWARDS — shown in the SAME dialog above, never a second
// popup. `he-IL` locale formatting matches this codebase's own convention
// for every other Money/Gold amount (see e.g. GymVictoryRewardDialog.tsx,
// components/layout/GameHeader.tsx) — thousands-separated, no decimals.
export const playerLevelUpDialogRewardTitle = "פרס עליית רמה:";

export function playerLevelUpDialogRewardMoneyLine(money: number): string {
  return `${money.toLocaleString("he-IL")} כסף`;
}

export function playerLevelUpDialogRewardGoldLine(gold: number): string {
  return `${gold.toLocaleString("he-IL")} זהב`;
}
