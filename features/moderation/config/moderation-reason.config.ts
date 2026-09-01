// STAFF / MODERATION — PHASE 3. The one canonical reason-validation rule
// every punishment/revocation orchestration service (chat-ban.service.ts,
// site-ban.service.ts, revoke-ban.service.ts) reads through — never a
// second, independently-maintained trim/length check duplicated per
// service, same "one canonical definition" precedent this feature's own
// duration config files already establish.
//
// 500 — longer than GLOBAL_CHAT_MESSAGE_MAX_LENGTH (300,
// features/chat/config/global-chat.config.ts), since this is an internal
// staff note (never shown to the punished player, never rendered as
// public chat content) rather than a public message, but still a bounded,
// sane cap — same "no unbounded free-text column" rule PlayerProfile.
// aboutMe's own 150-char cap already establishes for a comparable
// free-text field.
export const MODERATION_REASON_MAX_LENGTH = 500;

// Trims the raw input and returns null for anything that fails validation
// (empty after trim, or over the length cap) — never throws, so every
// caller can treat "null" as the one uniform "reject this input" signal
// before ever touching the database, same "validate at the boundary,
// never trust raw client input" rule global-chat.service.ts's own
// sendGlobalChatMessage already establishes for its own message field.
export function normalizeModerationReason(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MODERATION_REASON_MAX_LENGTH) return null;
  return trimmed;
}
