// FRIENDS PHASE 1 — the single source of truth for every tunable number
// this feature uses (friendship.service.ts, private-chat.service.ts, their
// tests, and the client UI all import from here). Deliberately its own
// constants, not re-exports of Global Chat's (features/chat/config/
// global-chat.config.ts) — the two features share the same shape of rule
// by coincidence (a 300-char message cap), not a value that must always
// move together; keeping them independent means a future change to one
// feature's limit can never silently affect the other.

// How many of the newest messages ONE private conversation ever keeps.
// Unlike Global Chat's single site-wide cap, this is enforced PER
// conversation — see private-chat.service.ts's sendPrivateMessage.
export const PRIVATE_CHAT_MAX_MESSAGES = 500;

// A trimmed message longer than this is rejected server-side (never just
// client-side) before it's ever written.
export const PRIVATE_CHAT_MESSAGE_MAX_LENGTH = 300;

// How often the client polls the currently-open conversation for new
// messages — only that one conversation, never every friendship at once
// (see use-private-chat.ts).
export const PRIVATE_CHAT_POLL_INTERVAL_MS = 2500;

// LIVE FRIEND REMOVAL SYNC — how often FriendsDataProvider re-fetches
// friends/incoming-requests in the background, purely to detect changes
// made from OUTSIDE this client (most importantly: the other side removing
// the friendship) — see friends-data-context.tsx's own doc comment. Same
// lightweight setInterval + server-action pattern (and the same ~2-3s
// cadence) every other polling surface in this app already uses — no
// WebSockets, no new realtime subsystem.
export const FRIENDS_DATA_POLL_INTERVAL_MS = 2500;
