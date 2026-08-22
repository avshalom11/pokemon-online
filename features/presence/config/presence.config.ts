// ONLINE PRESENCE — the single source of truth for every tunable number
// this feature uses (presence.service.ts, PresenceHeartbeat.tsx, the Home
// online-count poll, and their tests all import from here) — same "one
// small config file per feature" precedent features/chat/config/
// global-chat.config.ts and features/friends/config/friends.config.ts
// already establish. The "60 seconds" online window and the online/offline
// decision itself live ONLY here — never re-implemented inline in a React
// component or duplicated as a second literal elsewhere.

// How often the client sends a heartbeat while the authenticated game
// layout is mounted (features/presence/components/PresenceHeartbeat.tsx).
// Deliberately much coarser than the ~2.5s chat/friends poll cadence — a
// heartbeat only has to keep a player inside PRESENCE_ONLINE_WINDOW_MS
// below, never deliver anything close to real-time data, so a slow write
// cadence is the entire point (this feature's own explicit "do not update
// on every render/click" rule).
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 30_000;

// A player is ONLINE if their last recorded heartbeat is within this many
// ms of "now". Deliberately wider than PRESENCE_HEARTBEAT_INTERVAL_MS (not
// equal to it) so a single delayed/missed tick — a slow round trip, a
// background tab throttled by the browser — never flickers someone to
// "offline" between two real heartbeats.
export const PRESENCE_ONLINE_WINDOW_MS = 60_000;

// How often clients re-fetch presence-DERIVED data that has no other poll
// already carrying it — today, only the Home online-count card
// (OnlinePlayersCounter.tsx). Global Chat and the Friends Bar deliberately
// need NO separate presence poll at all: their own existing ~2.5s polls
// (useGlobalChat, FriendsDataProvider) already re-fetch on this same kind
// of cadence, and this feature's server-side view-builders (see
// global-chat.service.ts's getRecentGlobalChatMessages, friendship.
// service.ts's getFriendsAndRequests) compute each row's isOnline boolean
// fresh on every one of those existing reads — reusing the existing
// polling architecture literally, never adding a second poll loop for data
// another surface already refreshes on its own cadence.
export const PRESENCE_READ_POLL_INTERVAL_MS = 2_500;

// The ONE place "is this player online right now" is decided — every
// caller (presence.service.ts's getOnlinePlayerIdSet/getOnlinePlayerCount)
// goes through this function rather than re-implementing the window
// comparison inline, so PRESENCE_ONLINE_WINDOW_MS only ever has to be
// correct in one place.
export function isOnline(lastSeenAt: Date | null, now: Date = new Date()): boolean {
  if (!lastSeenAt) return false;
  return now.getTime() - lastSeenAt.getTime() <= PRESENCE_ONLINE_WINDOW_MS;
}
