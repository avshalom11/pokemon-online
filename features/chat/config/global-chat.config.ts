// GLOBAL CHAT — the single source of truth for every tunable number the
// feature uses, so none of them are ever hardcoded a second time anywhere
// else (global-chat.service.ts, its tests, and the client bar all import
// from here).

// How many of the newest messages the chat ever keeps, globally (not
// per-player). sendGlobalChatMessage enforces this on every insert by
// deleting the oldest row(s) once the table holds more than this many.
export const GLOBAL_CHAT_MAX_MESSAGES = 200;

// A trimmed message longer than this is rejected server-side (never just
// client-side) before it's ever written.
export const GLOBAL_CHAT_MESSAGE_MAX_LENGTH = 300;

// Minimal anti-spam guard: a player who sent a message more recently than
// this many milliseconds ago is rejected, same "small cooldown is enough
// for now" scope the feature was specified with — not a hardened
// distributed rate limiter.
export const GLOBAL_CHAT_SEND_COOLDOWN_MS = 1000;

// How often the client bar polls for new messages while expanded.
export const GLOBAL_CHAT_POLL_INTERVAL_MS = 2500;
