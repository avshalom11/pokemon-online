// STAFF / MODERATION — PHASE 1. The ONE canonical definition of chat-ban
// durations — every future caller (progressive DEPUTY/SUPPORT bans, the
// OWNER manual picker, and any future UI copy like "הרחקה מהצ'אט — 12
// שעות") reads through the helpers below rather than a second hardcoded
// duration table. Minutes are the one unit stored/compared everywhere in
// this feature (ModerationAction.durationMinutes) — never a mix of
// minutes/hours/days across call sites.

const MINUTE = 1;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Occurrence N (1-indexed: this player's Nth-ever chat ban, counting every
// chat ban regardless of which staff role issued it — see
// moderation-progression.service.ts's own doc comment) -> duration in
// minutes. Index 5 (the 6th entry) is deliberately the ceiling: every
// occurrence from the 6th on reuses it, per spec ("6th and every later
// chat ban: 7 days").
const CHAT_BAN_PROGRESSION_MINUTES: readonly number[] = [
  15 * MINUTE, // 1st
  1 * HOUR, // 2nd
  12 * HOUR, // 3rd
  1 * DAY, // 4th
  3 * DAY, // 5th
  7 * DAY, // 6th and every later ban
];

// occurrence must be >= 1 (the count AFTER this ban is recorded — see
// moderation-progression.service.ts's recordProgressiveChatBan, which
// passes the freshly-incremented PlayerModerationCounters.chatBanCount
// straight through). Occurrences past the table's length all clamp to the
// last (ceiling) entry.
export function getChatBanDurationMinutesForOccurrence(occurrence: number): number {
  if (!Number.isInteger(occurrence) || occurrence < 1) {
    throw new Error(`getChatBanDurationMinutesForOccurrence: occurrence must be a positive integer, got ${occurrence}`);
  }
  const index = Math.min(occurrence, CHAT_BAN_PROGRESSION_MINUTES.length) - 1;
  return CHAT_BAN_PROGRESSION_MINUTES[index]!;
}

// OWNER is not restricted by progression (PHASE 0/1 spec) — these are the
// exact fixed choices OWNER may pick from immediately, deliberately the
// SAME six values as the progression table above (never a second,
// independently-maintained duration list) so OWNER's manual picker and
// DEPUTY/SUPPORT's progressive copy can never drift out of sync with each
// other.
export const OWNER_CHAT_BAN_DURATION_OPTIONS_MINUTES: readonly number[] = CHAT_BAN_PROGRESSION_MINUTES;

export function isValidOwnerChatBanDurationMinutes(minutes: number): boolean {
  return OWNER_CHAT_BAN_DURATION_OPTIONS_MINUTES.includes(minutes);
}
