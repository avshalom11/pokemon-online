// Plain shared shapes for FRIENDS PHASE 1 (features/friends) — deliberately
// no "server-only" import here (unlike the *.service.ts files), so client
// components can import these types directly, same "server-only service,
// plain shared types" split features/chat/types.ts already establishes.

// The viewer's own relationship to a profile they're looking at — computed
// server-side (public-profile-view.service.ts) from the ONE Friendship
// table, never guessed client-side. "self" is its own state (never
// "none") so the Add Friend button can be hidden outright on your own
// profile rather than merely disabled.
export type FriendshipStatus = "self" | "none" | "pending-outgoing" | "pending-incoming" | "friends";

export interface FriendSummary {
  playerId: string;
  displayName: string;
  // CLICKABLE USERNAMES — see components/social/PlayerNameLink.tsx.
  username: string | null;
  // ONLINE PRESENCE — this friend's authoritative online/offline status at
  // the moment this row was read (features/presence/services/presence.
  // service.ts's isOnline), never a raw lastSeenAt timestamp. Recomputed
  // fresh on every getFriendsAndRequests call, so it stays live purely off
  // FriendsDataProvider's own existing poll — no dedicated presence poll.
  isOnline: boolean;
}

export interface PendingFriendRequestView {
  requestId: string;
  requesterPlayerId: string;
  requesterDisplayName: string;
  requesterUsername: string | null;
}

export interface FriendsAndRequestsView {
  friends: FriendSummary[];
  incomingRequests: PendingFriendRequestView[];
}

export type SendFriendRequestError = "unauthenticated" | "self" | "already-pending" | "already-friends" | "not-found";

export type SendFriendRequestResult =
  | { ok: true; autoAccepted: boolean }
  | { ok: false; error: SendFriendRequestError };

export type RespondToFriendRequestError = "unauthenticated" | "not-found";

export type RespondToFriendRequestResult = { ok: true } | { ok: false; error: RespondToFriendRequestError };

// REMOVE FRIEND — "not-found" covers every failure mode uniformly (no
// accepted friendship for this pair, an unrelated third player, a pair
// that's only ever been pending) — see removeFriend's own doc comment
// (friendship.service.ts) for why that's deliberate.
export type RemoveFriendError = "unauthenticated" | "not-found";

export type RemoveFriendResult = { ok: true } | { ok: false; error: RemoveFriendError };

// PRIVATE CHAT
export interface PrivateMessageView {
  id: string;
  playerDisplayName: string;
  // CLICKABLE USERNAMES — see components/social/PlayerNameLink.tsx.
  playerUsername: string | null;
  message: string;
  createdAt: string;
  sentTimeLabel: string;
}

export interface PrivateConversationView {
  conversationId: string;
  friendPlayerId: string;
  friendDisplayName: string;
  friendUsername: string | null;
  messages: PrivateMessageView[];
}

export type OpenConversationError = "unauthenticated" | "not-friends";

export type OpenConversationResult = { ok: true; conversation: PrivateConversationView } | { ok: false; error: OpenConversationError };

// "not-friends" — REMOVE FRIEND: the two players WERE a valid conversation
// participant pair, but the friendship has since been removed (or was
// never accepted, in some future scenario) — a distinct, meaningful state
// from "not-a-participant" (a genuinely unrelated third player/unknown
// conversation), even though both are equally non-actionable for the
// caller.
export type SendPrivateMessageError = "unauthenticated" | "not-a-participant" | "not-friends" | "empty" | "too-long";

export type SendPrivateMessageResult =
  | { ok: true; message: PrivateMessageView }
  | { ok: false; error: SendPrivateMessageError };
