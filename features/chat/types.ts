// Plain shared shapes for GLOBAL CHAT (features/chat) — deliberately no
// "server-only" import here (unlike global-chat.service.ts), so the client
// bar component can import these types directly, same "server-only service,
// plain shared types" split features/notifications/types.ts already
// establishes for NotificationBellData/NotificationSummary.

export interface GlobalChatMessageView {
  id: string;
  playerDisplayName: string;
  // CLICKABLE USERNAMES — null whenever a real username couldn't be
  // resolved for this sender (see lib/auth/player-profile.ts's
  // getPlayerIdentitiesByIds) — components/social/PlayerNameLink.tsx
  // renders plain, non-clickable text in that case rather than a broken
  // link.
  playerUsername: string | null;
  message: string;
  // ISO timestamp — plain data for the client to sort/dedupe polled rows
  // by; sentTimeLabel below is the only thing ever actually rendered.
  createdAt: string;
  // "HH:MM" in Asia/Jerusalem wall-clock time.
  sentTimeLabel: string;
  // ONLINE PRESENCE — the sender's authoritative online/offline status at
  // the moment this row was read (features/presence/services/presence.
  // service.ts's isOnline), never a raw lastSeenAt timestamp. Recomputed
  // fresh on every poll tick (getRecentGlobalChatMessages), so it stays
  // live without any dedicated presence poll of its own.
  isOnline: boolean;
}

// "unauthenticated" is only ever produced by the action layer (see
// global-chat.actions.ts) — sendGlobalChatMessage itself (global-chat.
// service.ts) always receives an already-resolved, trusted playerId and
// never needs to reason about session state, so it never returns this one.
export type SendGlobalChatMessageError = "empty" | "too-long" | "cooldown" | "unauthenticated";

export type SendGlobalChatMessageResult =
  | { ok: true; message: GlobalChatMessageView }
  | { ok: false; error: SendGlobalChatMessageError };
