// Non-blocking, persistent meta/progression events surfaced through the
// global header's notification bell — deliberately separate from the battle
// message box (features/battle/utils/battle-messages.ts), which only ever
// carries ephemeral, immediate battle events. See this module's
// notification-service.ts for where these are created.
//
// A one-member union today; grow it here (never with a migration — see the
// `type` field's own comment in prisma/schema.prisma) as future systems
// need it: "ITEM_FOUND" | "MOVE_LEARNED" | "POKEMON_EVOLVED" |
// "QUEST_COMPLETED" | "ACHIEVEMENT_UNLOCKED" | ...
export type NotificationType = "PLAYER_LEVEL_UP";

export interface NotificationSummary {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationBellData {
  unreadCount: number;
  // Most recent notifications regardless of read state, newest first — the
  // dropdown's own empty state covers the "none at all" case.
  recent: NotificationSummary[];
}
