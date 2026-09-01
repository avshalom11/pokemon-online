import "server-only";

import { getChatBanDurationMinutesForOccurrence } from "@/features/moderation/config/chat-ban-progression.config";
import { getSiteBanDurationMinutesForOccurrence } from "@/features/moderation/config/site-ban-progression.config";
import { getModerationCounters } from "@/features/moderation/services/moderation-progression.service";

// STAFF / MODERATION — PHASE 5 — PROGRESSIVE DURATION UX. The read-only
// "what would the NEXT punishment be" preview DEPUTY/SUPPORT's own
// confirmation dialog calls before the player confirms anything (spec:
// "obtain/display the authoritative next duration from the server...
// do not calculate progression in the client"). Reads the target's
// CURRENT counter and feeds count+1 through the exact same canonical
// duration tables the real issuing services (moderation-progression.
// service.ts's recordProgressiveChatBan/recordProgressiveSiteBan) use —
// never a second, independently-maintained progression rule.
//
// STALENESS — deliberately NOT re-checked/locked here: this is a plain
// read with no transaction, so the actual duration applied when the
// player later confirms can differ if another staff member's own
// punishment for the same target lands in between (this preview's own
// count+1 could be superseded). That's fine — the ACTUAL issuing call
// (issueChatBan/issueTemporarySiteBan) is what's authoritative and
// atomically race-safe (see moderation-progression.service.ts's own doc
// comments); this preview is purely advisory display copy, exactly like
// "here's roughly what will happen" — never trusted as the real applied
// duration, which the issuing call's own response reports afterward.
export async function previewNextChatBanDurationMinutes(targetPlayerId: string): Promise<number> {
  const counters = await getModerationCounters(targetPlayerId);
  return getChatBanDurationMinutesForOccurrence(counters.chatBanCount + 1);
}

export async function previewNextSiteBanDurationMinutes(targetPlayerId: string): Promise<number> {
  const counters = await getModerationCounters(targetPlayerId);
  return getSiteBanDurationMinutesForOccurrence(counters.siteBanCount + 1);
}
