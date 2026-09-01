import "server-only";

import { isValidOwnerChatBanDurationMinutes } from "@/features/moderation/config/chat-ban-progression.config";
import { normalizeModerationReason } from "@/features/moderation/config/moderation-reason.config";
import { authorizeModerationAction, type AuthorizeModerationActionError } from "@/features/moderation/services/authorize-moderation-action";
import {
  recordManualChatBan,
  recordProgressiveChatBan,
  type ModerationActionRecord,
} from "@/features/moderation/services/moderation-progression.service";

export type IssueChatBanError =
  | "invalid-reason"
  | AuthorizeModerationActionError
  | "owner-duration-required"
  | "invalid-owner-duration"
  | "duration-not-allowed-for-role";

export interface IssueChatBanSuccess {
  ok: true;
  action: ModerationActionRecord;
  occurrence: number;
  durationMinutes: number;
  expiresAt: Date;
}

// STAFF / MODERATION — PHASE 5 — "already-banned" always carries the
// blocking ban's own id (see moderation-progression.service.ts's own
// RecordPunishmentResult doc comment) — a distinct union member, never
// folded into the plain IssueChatBanError string union above, so a
// consumer that narrows on `error === "already-banned"` gets
// `existingActionId` for free without an extra cast.
export type IssueChatBanResult =
  | IssueChatBanSuccess
  | { ok: false; error: "already-banned"; existingActionId: string }
  | { ok: false; error: IssueChatBanError };

// STAFF / MODERATION — PHASE 3. The authoritative chat-ban service — the
// one place every future caller (a Server Action, once one exists) issues
// a chat ban through. Runs the full sequence Phase 3's own spec calls
// out, in order:
//   1. validate the reason
//   2. authorize the actor + validate hierarchy/target
//      (authorizeModerationAction)
//   3. branch on the actor's OWN resolved role:
//      - OWNER: a duration is REQUIRED and must be one of the six
//        canonical values (isValidOwnerChatBanDurationMinutes) — OWNER is
//        "not restricted by progression" (spec), so this never touches
//        the progression table.
//      - DEPUTY/SUPPORT: a duration must NOT be supplied at all — "They
//        cannot choose another duration" (spec) is enforced here as a
//        hard rejection, not merely "silently ignored", so a caller bug
//        that tried to let a non-OWNER pick a duration fails loudly
//        instead of quietly doing the wrong thing.
//   4. delegate to moderation-progression.service.ts's
//      recordManualChatBan/recordProgressiveChatBan, which own the
//      actual transaction: serialize the target's progression, determine
//      the duration, increment chatBanCount, create the ModerationAction,
//      and reject "already-banned" if the target already has an active
//      chat ban — all atomically, inside ONE transaction (see that
//      module's own doc comments for exactly how).
//
// `role` is never trusted from the caller — authorizeModerationAction
// always re-resolves it fresh from the database.
export async function issueChatBan(params: {
  actorPlayerId: string;
  targetPlayerId: string;
  reason: string;
  // Required for OWNER, must be omitted for DEPUTY/SUPPORT — see this
  // function's own doc comment.
  durationMinutes?: number;
}): Promise<IssueChatBanResult> {
  const reason = normalizeModerationReason(params.reason);
  if (reason === null) return { ok: false, error: "invalid-reason" };

  const authorization = await authorizeModerationAction({
    actorPlayerId: params.actorPlayerId,
    targetPlayerId: params.targetPlayerId,
    requiredPermission: "canIssueChatBans",
  });
  if (!authorization.ok) return { ok: false, error: authorization.error };

  if (authorization.actorRole === "OWNER") {
    if (params.durationMinutes === undefined) return { ok: false, error: "owner-duration-required" };
    if (!isValidOwnerChatBanDurationMinutes(params.durationMinutes)) return { ok: false, error: "invalid-owner-duration" };

    const result = await recordManualChatBan({
      targetPlayerId: params.targetPlayerId,
      actorPlayerId: params.actorPlayerId,
      durationMinutes: params.durationMinutes,
      reason,
    });
    return result;
  }

  if (params.durationMinutes !== undefined) return { ok: false, error: "duration-not-allowed-for-role" };

  return recordProgressiveChatBan({
    targetPlayerId: params.targetPlayerId,
    actorPlayerId: params.actorPlayerId,
    reason,
  });
}
