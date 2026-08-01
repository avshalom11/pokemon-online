// Non-blocking, persistent meta/progression events surfaced through the
// global header's notification bell — deliberately separate from the battle
// message box (features/battle/utils/battle-messages.ts), which only ever
// carries ephemeral, immediate battle events. See this module's
// notification-service.ts for where these are created.
//
// Grow this union here (never with a migration — see the `type` field's
// own comment in prisma/schema.prisma) as future systems need it:
// "ITEM_FOUND" | "MOVE_LEARNED" | "POKEMON_EVOLVED" | "QUEST_COMPLETED" |
// "ACHIEVEMENT_UNLOCKED" | ...
//
// CURRENCY_MONEY_REWARD / CURRENCY_GOLD_REWARD: created by
// features/currency/services/field-battle-currency-reward.service.ts
// whenever a confirmed wild-Pokémon victory rolls a currency drop — see
// that file's own doc comment for exactly when (and, just as importantly,
// when not).
//
// SHOP_PURCHASE: created by features/shop/services/shop-purchase.service.ts
// on every successful item purchase.
//
// SHOP_SELL: created by features/inventory/services/inventory-sell.service.ts
// on every successful sale of an owned item back for currency.
//
// POKEMON_EVOLVED: created by
// features/evolution/services/accept-evolution.service.ts on every
// successfully accepted evolution — never on rejection, and never for the
// pending decision itself (see that file's own doc comment).
export type NotificationType =
  | "PLAYER_LEVEL_UP"
  | "CURRENCY_MONEY_REWARD"
  | "CURRENCY_GOLD_REWARD"
  | "SHOP_PURCHASE"
  | "SHOP_SELL"
  | "POKEMON_EVOLVED";

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
