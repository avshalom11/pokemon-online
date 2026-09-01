"use server";

import { authorizeModerationAction } from "@/features/moderation/services/authorize-moderation-action";
import { previewNextSiteBanDurationMinutes } from "@/features/moderation/services/progression-preview.service";
import { resolveUsernameToPlayerId } from "@/features/moderation/services/resolve-username-target.service";
import { issuePermanentSiteBan, issueTemporarySiteBan, type IssuePermanentSiteBanResult, type IssueTemporarySiteBanResult } from "@/features/moderation/services/site-ban.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// STAFF / MODERATION — PROFILE SITE-BAN ENTRY POINT. The public-profile
// counterpart to global-chat-moderation.actions.ts — same Server Action
// shape this codebase's convention already establishes (resolve the real
// session server-side, resolve the acting player's OWN trusted identity
// from it, then delegate everything else to a service), and the SAME two
// underlying services (site-ban.service.ts's issueTemporarySiteBan/
// issuePermanentSiteBan, progression-preview.service.ts's
// previewNextSiteBanDurationMinutes) the Global Chat ⋮ menu already calls —
// this file adds no new punishment logic, progression, permission,
// hierarchy, audit, session-revocation, or active-ban-detection code
// whatsoever, only a second, differently-targeted entry point into the
// exact same authoritative system.
//
// TARGET RESOLUTION — the one real difference from the chat version: this
// action never originates from a chat message, so there is no messageId to
// resolve a target from. The client instead sends the public profile's own
// canonical identifier — its username, exactly what the profile route
// itself is keyed by (app/(game)/profile/[username]/page.tsx) and exactly
// the same "client sends a username, server resolves the real
// PlayerProfile.id" pattern manage-staff.actions.ts's own
// appointStaffMemberAction/removeStaffMemberAction already establish (see
// resolveUsernameToPlayerId's own doc comment) — never a raw playerId
// trusted from the client, and never messageId reused for a target this
// action doesn't have.
export type ProfileModerationActionAuthError = "unauthenticated" | "target-not-found";

async function resolveActorPlayerId(): Promise<string | null> {
  const session = await getCurrentSession();
  if (!session) return null;
  const profile = await getPlayerProfile(session.user.id);
  return profile.id;
}

export async function issueProfileTemporarySiteBanAction(params: {
  targetUsername: string;
  reason: string;
  // Only ever consulted for an OWNER actor (issueTemporarySiteBan itself
  // rejects it outright for anyone else) — never trusted as "the" duration
  // for DEPUTY, who always gets the server-computed progressive one
  // regardless of whatever a tampered client request might include here.
  durationMinutes?: number;
}): Promise<IssueTemporarySiteBanResult | { ok: false; error: ProfileModerationActionAuthError }> {
  const actorPlayerId = await resolveActorPlayerId();
  if (!actorPlayerId) return { ok: false, error: "unauthenticated" };

  const targetPlayerId = await resolveUsernameToPlayerId(params.targetUsername);
  if (!targetPlayerId) return { ok: false, error: "target-not-found" };

  return issueTemporarySiteBan({
    actorPlayerId,
    targetPlayerId,
    reason: params.reason,
    durationMinutes: params.durationMinutes,
  });
}

export async function issueProfilePermanentSiteBanAction(params: {
  targetUsername: string;
  reason: string;
}): Promise<IssuePermanentSiteBanResult | { ok: false; error: ProfileModerationActionAuthError }> {
  const actorPlayerId = await resolveActorPlayerId();
  if (!actorPlayerId) return { ok: false, error: "unauthenticated" };

  const targetPlayerId = await resolveUsernameToPlayerId(params.targetUsername);
  if (!targetPlayerId) return { ok: false, error: "target-not-found" };

  return issuePermanentSiteBan({ actorPlayerId, targetPlayerId, reason: params.reason });
}

export type PreviewProfileSiteBanDurationError =
  | ProfileModerationActionAuthError
  | "actor-not-staff"
  | "actor-lacks-permission"
  | "hierarchy-violation";

export type PreviewProfileSiteBanDurationResult =
  | { ok: true; durationMinutes: number }
  | { ok: false; error: PreviewProfileSiteBanDurationError };

// PROGRESSIVE DURATION UX — same "the one server round trip DEPUTY's own
// confirmation dialog makes BEFORE the player confirms anything" contract
// global-chat-moderation.actions.ts's own previewSiteBanDurationAction
// already establishes — see that function's own doc comment. Re-authorizes
// the SAME way the real issuing action would (canIssueSiteBans +
// hierarchy) before revealing anything.
export async function previewProfileSiteBanDurationAction(params: {
  targetUsername: string;
}): Promise<PreviewProfileSiteBanDurationResult> {
  const actorPlayerId = await resolveActorPlayerId();
  if (!actorPlayerId) return { ok: false, error: "unauthenticated" };

  const targetPlayerId = await resolveUsernameToPlayerId(params.targetUsername);
  if (!targetPlayerId) return { ok: false, error: "target-not-found" };

  const authorization = await authorizeModerationAction({
    actorPlayerId,
    targetPlayerId,
    requiredPermission: "canIssueSiteBans",
  });
  if (!authorization.ok) return { ok: false, error: authorization.error };

  const durationMinutes = await previewNextSiteBanDurationMinutes(targetPlayerId);
  return { ok: true, durationMinutes };
}
