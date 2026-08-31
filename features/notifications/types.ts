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
//
// CHEST_OPENED: created by features/chests/services/chest-open.service.ts
// on every successful chest opening — one notification per opening
// (summarizing the chest type), never one per individual reward granted.
//
// FRIEND_REQUEST_RECEIVED: created by features/friends/services/
// friendship.service.ts's sendFriendRequest, for the ADDRESSEE only,
// exactly once per new pending request (never for the auto-accept path —
// see that function's own doc comment for why a mutual double-send
// resolves as an acceptance instead of a second request).
//
// PRIVATE_MESSAGE_RECEIVED: created by features/friends/services/
// private-chat.service.ts's sendPrivateMessage, for the RECIPIENT only.
// Carries `{ conversationId, senderPlayerId }` in `metadata` — the one
// thing sendPrivateMessage uses to avoid re-notifying for a conversation
// that already has an unread notification pending (see that function's
// own doc comment for the exact, deliberately simple dedup rule, and its
// documented limitation: this is NOT live "is the recipient currently
// looking at this chat" presence detection, which this project's polling-
// only architecture has no reliable way to determine).
//
// MARKETPLACE_LISTING_SOLD: created by features/marketplace/services/
// purchase-listing.service.ts's purchaseMarketplaceListing, for the SELLER
// only, inside the exact same transaction as the purchase itself — a
// thrown/rolled-back purchase never reaches this, so a failed/rolled-back
// purchase can never leave a stray notification behind. Message lists the
// real buyer username and every Pokémon/item actually transferred (see
// features/marketplace/messages/marketplace-purchase-messages.ts). Never
// carries metadata — this is informational only, no inline quick action.
//
// SECURITY_LOGIN_LOCKOUT: created by lib/auth/player-profile.ts's
// notifySecurityLoginLockout, called from lib/auth/actions.ts's loginAction
// the ONE time a given (identifier, IP) pair's failed-attempt count newly
// crosses the lockout threshold (see lib/auth/login-lockout.ts's own
// recordFailedLoginAttempt doc comment for why that's naturally exactly
// once per lock window, with no separate dedup flag needed). Never carries
// the attacker's IP or any other security detail in `message`/`metadata` —
// only the fact that a lockout happened.
//
// LEAGUE_PLACEMENT_ACHIEVED: this type's ONLY job is being the persisted
// "the player has acknowledged their League Placement Celebration modal for
// this exact tournament" record (features/leagues/services/
// league-placement-celebration.service.ts's own acknowledgeLeaguePlacementCelebration,
// the ONLY place this is ever created) — its isRead state is never read or
// relied on for this type (there is no separate unread/pending state to
// track here: a PENDING celebration is derived instead, by finding a real
// LeagueTournamentPlacement row with no matching notification of this type
// yet — see that same file; ACKNOWLEDGED is this row's mere existence).
// Always carries `{ tournamentId, leagueId,
// place }` in `metadata` — `tournamentId` is what makes a specific
// acknowledgement idempotent and tied to one specific earned placement, so
// a future placement (a different tournament, even in the same League)
// always produces its own, independent celebration.
export type NotificationType =
  | "PLAYER_LEVEL_UP"
  | "CURRENCY_MONEY_REWARD"
  | "CURRENCY_GOLD_REWARD"
  | "SHOP_PURCHASE"
  | "SHOP_SELL"
  | "POKEMON_EVOLVED"
  | "CHEST_OPENED"
  | "FRIEND_REQUEST_RECEIVED"
  | "PRIVATE_MESSAGE_RECEIVED"
  | "SECURITY_LOGIN_LOCKOUT"
  | "MARKETPLACE_LISTING_SOLD"
  | "LEAGUE_PLACEMENT_ACHIEVED";

export interface NotificationSummary {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
  // FRIENDS QUICK ACTIONS — the same structured data createNotification's
  // own `metadata` param already persists (notification-service.ts),
  // passed straight through to the client. Only two shapes exist today:
  // FRIEND_REQUEST_RECEIVED carries `{ requestId, requesterPlayerId }`
  // (NotificationBell.tsx's own inline אשר/לא מאשר buttons — reuses
  // respondToFriendRequestAction, never a second accept/decline
  // implementation); PRIVATE_MESSAGE_RECEIVED carries `{ conversationId,
  // senderPlayerId, senderDisplayName }` (PrivateMessagePopupWatcher.tsx's
  // own new-message toast). null for every other notification type, which
  // never needs to be actionable from the bell itself.
  metadata: Record<string, unknown> | null;
}

export interface NotificationBellData {
  unreadCount: number;
  // Most recent notifications regardless of read state, newest first — the
  // dropdown's own empty state covers the "none at all" case.
  recent: NotificationSummary[];
}
