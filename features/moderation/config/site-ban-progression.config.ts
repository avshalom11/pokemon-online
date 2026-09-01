// STAFF / MODERATION — PHASE 1. The site-ban counterpart to
// chat-ban-progression.config.ts — same shape, same "one canonical table,
// every caller reads through these helpers" rule, but a COMPLETELY
// INDEPENDENT duration table and a completely independent occurrence
// count (PlayerModerationCounters.siteBanCount, never chatBanCount) per
// spec: chat-ban and site-ban progression must never share or influence
// each other.

const MINUTE = 1;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Occurrence N (1-indexed: this player's Nth-ever TEMPORARY site ban —
// never counting the separate, non-progressive permanent site ban, see
// moderation-progression.service.ts's own doc comment) -> duration in
// minutes. Index 4 (the 5th entry) is the ceiling: every occurrence from
// the 5th on reuses it, per spec ("5th and every later site ban: 7 days").
const SITE_BAN_PROGRESSION_MINUTES: readonly number[] = [
  30 * MINUTE, // 1st
  6 * HOUR, // 2nd
  1 * DAY, // 3rd
  3 * DAY, // 4th
  7 * DAY, // 5th and every later ban
];

export function getSiteBanDurationMinutesForOccurrence(occurrence: number): number {
  if (!Number.isInteger(occurrence) || occurrence < 1) {
    throw new Error(`getSiteBanDurationMinutesForOccurrence: occurrence must be a positive integer, got ${occurrence}`);
  }
  const index = Math.min(occurrence, SITE_BAN_PROGRESSION_MINUTES.length) - 1;
  return SITE_BAN_PROGRESSION_MINUTES[index]!;
}

// OWNER is not restricted by progression — same five values as the
// progression table above, never a second independently-maintained list.
export const OWNER_SITE_BAN_DURATION_OPTIONS_MINUTES: readonly number[] = SITE_BAN_PROGRESSION_MINUTES;

export function isValidOwnerSiteBanDurationMinutes(minutes: number): boolean {
  return OWNER_SITE_BAN_DURATION_OPTIONS_MINUTES.includes(minutes);
}
