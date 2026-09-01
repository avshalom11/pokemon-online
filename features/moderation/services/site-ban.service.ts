import "server-only";

import { isValidOwnerSiteBanDurationMinutes } from "@/features/moderation/config/site-ban-progression.config";
import { normalizeModerationReason } from "@/features/moderation/config/moderation-reason.config";
import { authorizeModerationAction, type AuthorizeModerationActionError } from "@/features/moderation/services/authorize-moderation-action";
import {
  recordManualSiteBan,
  recordPermanentSiteBan,
  recordProgressiveSiteBan,
  type ModerationActionRecord,
} from "@/features/moderation/services/moderation-progression.service";
import { revokeAllSessionsForUser } from "@/lib/auth/session-revocation";
import { prisma } from "@/lib/db/prisma";

export type IssueTemporarySiteBanError =
  | "invalid-reason"
  | AuthorizeModerationActionError
  | "owner-duration-required"
  | "invalid-owner-duration"
  | "duration-not-allowed-for-role";

export interface IssueTemporarySiteBanSuccess {
  ok: true;
  action: ModerationActionRecord;
  occurrence: number;
  durationMinutes: number;
  expiresAt: Date;
}

// STAFF / MODERATION — PHASE 5 — same "already-banned" carries
// existingActionId" distinct-union-member shape chat-ban.service.ts's own
// IssueChatBanResult already establishes — see that type's own doc
// comment.
export type IssueTemporarySiteBanResult =
  | IssueTemporarySiteBanSuccess
  | { ok: false; error: "already-banned"; existingActionId: string }
  | { ok: false; error: IssueTemporarySiteBanError };

// STAFF / MODERATION — PHASE 4 — EXISTING SESSION REVOCATION. Called
// after EVERY successfully-issued site ban (temporary AND permanent —
// spec) here in site-ban.service.ts alone; chat-ban.service.ts never
// imports this at all, which is what makes "do NOT revoke sessions for a
// chat ban" true by construction rather than a runtime branch that could
// be gotten wrong.
//
// Resolves targetPlayerId (a PlayerProfile.id, what every function in
// this feature keys punishments by) to the Better Auth User.id
// Session.userId actually references — the one place in this feature
// that needs that reverse lookup, so it's done inline here rather than
// growing lib/auth/player-profile.ts's own exported surface for a single
// call site.
//
// BEST-EFFORT: wrapped in its own try/catch so a revocation failure can
// never fail (or roll back) the ban itself, which has already been
// durably recorded by the time this runs — see lib/auth/
// session-revocation.ts's own doc comment for why this is safe: the
// site-ban check inside getCurrentSession() is the authoritative
// backstop regardless of whether this side effect ever completes.
async function revokeSessionsForBannedTarget(targetPlayerId: string): Promise<void> {
  try {
    const profile = await prisma.playerProfile.findUnique({ where: { id: targetPlayerId }, select: { userId: true } });
    if (!profile) return;
    await revokeAllSessionsForUser(profile.userId);
  } catch {
    // Deliberately swallowed — see this function's own doc comment.
  }
}

// STAFF / MODERATION — PHASE 3/4. The temporary-site-ban counterpart to
// chat-ban.service.ts's issueChatBan — same shape, same sequence
// (validate reason -> authorize + hierarchy -> branch on actor role ->
// delegate to the transaction-owning recordX primitive -> PHASE 4: revoke
// the target's existing sessions on success), against the fully
// independent siteBanCount progression instead.
//
// SUPPORT REJECTION — "SUPPORT must be rejected" (spec) requires no
// special-case code here at all: authorizeModerationAction's own
// `requiredPermission: "canIssueSiteBans"` check already resolves to
// false for SUPPORT (features/moderation/permissions/staff-permissions.ts
// — SUPPORT_PERMISSIONS never sets canIssueSiteBans), so a SUPPORT caller
// is rejected with "actor-lacks-permission" through the exact same shared
// path DEPUTY/OWNER go through, never a bespoke SUPPORT check.
export async function issueTemporarySiteBan(params: {
  actorPlayerId: string;
  targetPlayerId: string;
  reason: string;
  // Required for OWNER, must be omitted for DEPUTY.
  durationMinutes?: number;
}): Promise<IssueTemporarySiteBanResult> {
  const reason = normalizeModerationReason(params.reason);
  if (reason === null) return { ok: false, error: "invalid-reason" };

  const authorization = await authorizeModerationAction({
    actorPlayerId: params.actorPlayerId,
    targetPlayerId: params.targetPlayerId,
    requiredPermission: "canIssueSiteBans",
  });
  if (!authorization.ok) return { ok: false, error: authorization.error };

  let result: IssueTemporarySiteBanResult;
  if (authorization.actorRole === "OWNER") {
    if (params.durationMinutes === undefined) return { ok: false, error: "owner-duration-required" };
    if (!isValidOwnerSiteBanDurationMinutes(params.durationMinutes)) return { ok: false, error: "invalid-owner-duration" };

    result = await recordManualSiteBan({
      targetPlayerId: params.targetPlayerId,
      actorPlayerId: params.actorPlayerId,
      durationMinutes: params.durationMinutes,
      reason,
    });
  } else {
    // Only DEPUTY can reach here — SUPPORT was already rejected above by
    // authorizeModerationAction's own canIssueSiteBans check.
    if (params.durationMinutes !== undefined) return { ok: false, error: "duration-not-allowed-for-role" };

    result = await recordProgressiveSiteBan({
      targetPlayerId: params.targetPlayerId,
      actorPlayerId: params.actorPlayerId,
      reason,
    });
  }

  if (result.ok) await revokeSessionsForBannedTarget(params.targetPlayerId);
  return result;
}

export type IssuePermanentSiteBanError = "invalid-reason" | AuthorizeModerationActionError;

export type IssuePermanentSiteBanResult =
  | { ok: true; action: ModerationActionRecord }
  | { ok: false; error: "already-banned"; existingActionId: string }
  | { ok: false; error: IssuePermanentSiteBanError };

// PERMANENT SITE BAN — OWNER-only, falls out of the same shared
// requiredPermission check (only OWNER_PERMISSIONS.canIssuePermanentSiteBan
// is true), no duration branching at all (permanent bans have none), and
// is rejected if an already-active permanent ban exists for this target
// (recordPermanentSiteBan's own duplicate guard) — never touches
// chatBanCount/siteBanCount, per spec. PHASE 4: also revokes the target's
// existing sessions on success, same as the temporary path above.
export async function issuePermanentSiteBan(params: {
  actorPlayerId: string;
  targetPlayerId: string;
  reason: string;
}): Promise<IssuePermanentSiteBanResult> {
  const reason = normalizeModerationReason(params.reason);
  if (reason === null) return { ok: false, error: "invalid-reason" };

  const authorization = await authorizeModerationAction({
    actorPlayerId: params.actorPlayerId,
    targetPlayerId: params.targetPlayerId,
    requiredPermission: "canIssuePermanentSiteBan",
  });
  if (!authorization.ok) return { ok: false, error: authorization.error };

  const result = await recordPermanentSiteBan({
    targetPlayerId: params.targetPlayerId,
    actorPlayerId: params.actorPlayerId,
    reason,
  });

  if (result.ok) await revokeSessionsForBannedTarget(params.targetPlayerId);
  return result;
}
