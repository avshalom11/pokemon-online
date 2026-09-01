"use server";

import { authorizeModerationAction } from "@/features/moderation/services/authorize-moderation-action";
import { deleteGlobalChatMessage, type DeleteGlobalChatMessageResult } from "@/features/moderation/services/delete-message.service";
import { issueChatBan, type IssueChatBanResult } from "@/features/moderation/services/chat-ban.service";
import { issuePermanentSiteBan, issueTemporarySiteBan, type IssuePermanentSiteBanResult, type IssueTemporarySiteBanResult } from "@/features/moderation/services/site-ban.service";
import { previewNextChatBanDurationMinutes, previewNextSiteBanDurationMinutes } from "@/features/moderation/services/progression-preview.service";
import { revokeBan, type RevokeBanResult } from "@/features/moderation/services/revoke-ban.service";
import { resolveChatMessageTarget } from "@/features/moderation/services/resolve-chat-message-target.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// STAFF / MODERATION — PHASE 5. Every Server Action in this file follows
// the exact same shape this codebase's own Server Action convention
// already establishes (see e.g. features/chat/actions/global-chat.
// actions.ts): resolve the real session server-side, resolve the acting
// player's OWN trusted identity from it, then delegate everything else to
// a service — never trusting role, target identity, duration eligibility,
// or progression state from the client. The only thing any of these
// actions ever accepts as a "who" from the client is a messageId (per
// this phase's own explicit rule) — the real target playerId is always
// resolved server-side from that message via resolveChatMessageTarget
// (or, for deletion, internally by deleteGlobalChatMessage itself).
export type ModerationActionAuthError = "unauthenticated" | "message-not-found";

async function resolveActorPlayerId(): Promise<string | null> {
  const session = await getCurrentSession();
  if (!session) return null;
  const profile = await getPlayerProfile(session.user.id);
  return profile.id;
}

export async function deleteGlobalChatMessageAction(params: {
  messageId: string;
  reason: string;
}): Promise<DeleteGlobalChatMessageResult | { ok: false; error: "unauthenticated" }> {
  const actorPlayerId = await resolveActorPlayerId();
  if (!actorPlayerId) return { ok: false, error: "unauthenticated" };

  return deleteGlobalChatMessage({ actorPlayerId, messageId: params.messageId, reason: params.reason });
}

export async function issueChatBanAction(params: {
  messageId: string;
  reason: string;
  // Only ever consulted for an OWNER actor (issueChatBan itself rejects it
  // outright for anyone else) — never trusted as "the" duration for
  // DEPUTY/SUPPORT, who always get the server-computed progressive one
  // regardless of whatever a tampered client request might include here.
  durationMinutes?: number;
}): Promise<IssueChatBanResult | { ok: false; error: ModerationActionAuthError }> {
  const actorPlayerId = await resolveActorPlayerId();
  if (!actorPlayerId) return { ok: false, error: "unauthenticated" };

  const target = await resolveChatMessageTarget(params.messageId);
  if (!target) return { ok: false, error: "message-not-found" };

  return issueChatBan({
    actorPlayerId,
    targetPlayerId: target.targetPlayerId,
    reason: params.reason,
    durationMinutes: params.durationMinutes,
  });
}

export async function issueTemporarySiteBanAction(params: {
  messageId: string;
  reason: string;
  durationMinutes?: number;
}): Promise<IssueTemporarySiteBanResult | { ok: false; error: ModerationActionAuthError }> {
  const actorPlayerId = await resolveActorPlayerId();
  if (!actorPlayerId) return { ok: false, error: "unauthenticated" };

  const target = await resolveChatMessageTarget(params.messageId);
  if (!target) return { ok: false, error: "message-not-found" };

  return issueTemporarySiteBan({
    actorPlayerId,
    targetPlayerId: target.targetPlayerId,
    reason: params.reason,
    durationMinutes: params.durationMinutes,
  });
}

export async function issuePermanentSiteBanAction(params: {
  messageId: string;
  reason: string;
}): Promise<IssuePermanentSiteBanResult | { ok: false; error: ModerationActionAuthError }> {
  const actorPlayerId = await resolveActorPlayerId();
  if (!actorPlayerId) return { ok: false, error: "unauthenticated" };

  const target = await resolveChatMessageTarget(params.messageId);
  if (!target) return { ok: false, error: "message-not-found" };

  return issuePermanentSiteBan({ actorPlayerId, targetPlayerId: target.targetPlayerId, reason: params.reason });
}

// Revokes an EXISTING ModerationAction by its own id — the recovery path
// offered when an issue-ban action above is rejected with
// "already-banned" (which carries exactly this id — see
// moderation-progression.service.ts's own RecordPunishmentResult doc
// comment). Never reachable from a bare messageId, since the thing being
// acted on here is the PRIOR punishment record, not the chat message.
export async function revokeBanAction(params: {
  actionId: string;
  reason: string;
}): Promise<RevokeBanResult | { ok: false; error: "unauthenticated" }> {
  const actorPlayerId = await resolveActorPlayerId();
  if (!actorPlayerId) return { ok: false, error: "unauthenticated" };

  return revokeBan({ actorPlayerId, actionId: params.actionId, reason: params.reason });
}

export type PreviewDurationError = ModerationActionAuthError | "actor-not-staff" | "actor-lacks-permission" | "hierarchy-violation";
export type PreviewDurationResult = { ok: true; durationMinutes: number } | { ok: false; error: PreviewDurationError };

// PROGRESSIVE DURATION UX — the one server round trip DEPUTY/SUPPORT's
// own confirmation dialog makes BEFORE the player confirms anything, so
// it can show "הרחקה מהצ'אט — 12 שעות" using the real, authoritative next
// duration (features/moderation/services/progression-preview.service.ts)
// instead of ever computing progression client-side. Re-authorizes the
// SAME way the real issuing action would (canIssueChatBans + hierarchy)
// before revealing anything, so this can never be used as a side-channel
// to learn a ban count/duration a caller wasn't otherwise allowed to
// affect.
export async function previewChatBanDurationAction(params: { messageId: string }): Promise<PreviewDurationResult> {
  const actorPlayerId = await resolveActorPlayerId();
  if (!actorPlayerId) return { ok: false, error: "unauthenticated" };

  const target = await resolveChatMessageTarget(params.messageId);
  if (!target) return { ok: false, error: "message-not-found" };

  const authorization = await authorizeModerationAction({
    actorPlayerId,
    targetPlayerId: target.targetPlayerId,
    requiredPermission: "canIssueChatBans",
  });
  if (!authorization.ok) return { ok: false, error: authorization.error };

  const durationMinutes = await previewNextChatBanDurationMinutes(target.targetPlayerId);
  return { ok: true, durationMinutes };
}

export async function previewSiteBanDurationAction(params: { messageId: string }): Promise<PreviewDurationResult> {
  const actorPlayerId = await resolveActorPlayerId();
  if (!actorPlayerId) return { ok: false, error: "unauthenticated" };

  const target = await resolveChatMessageTarget(params.messageId);
  if (!target) return { ok: false, error: "message-not-found" };

  const authorization = await authorizeModerationAction({
    actorPlayerId,
    targetPlayerId: target.targetPlayerId,
    requiredPermission: "canIssueSiteBans",
  });
  if (!authorization.ok) return { ok: false, error: authorization.error };

  const durationMinutes = await previewNextSiteBanDurationMinutes(target.targetPlayerId);
  return { ok: true, durationMinutes };
}
