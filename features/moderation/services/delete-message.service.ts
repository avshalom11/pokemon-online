import "server-only";

import { normalizeModerationReason } from "@/features/moderation/config/moderation-reason.config";
import { authorizeModerationAction, type AuthorizeModerationActionError } from "@/features/moderation/services/authorize-moderation-action";
import { recordMessageDeletion } from "@/features/moderation/services/moderation-progression.service";
import { prisma } from "@/lib/db/prisma";

export type DeleteGlobalChatMessageError = "invalid-reason" | "message-not-found" | AuthorizeModerationActionError;

export type DeleteGlobalChatMessageResult = { ok: true; deletedMessageId: string } | { ok: false; error: DeleteGlobalChatMessageError };

// STAFF / MODERATION — PHASE 5. The authoritative Global Chat message
// deletion service — resolves the message's real owner from the database
// FIRST (never a client-supplied playerId — the Server Action wrapper
// only ever passes a messageId, per this phase's own explicit rule for
// every message-based action), then runs the exact same
// authorizeModerationAction sequence every other punishment service in
// this feature already uses (canDeleteChatMessages permission +
// canModerateTarget hierarchy against the MESSAGE OWNER's role) — this is
// what makes "staff cannot bypass hierarchy through message deletion" and
// "OWNER's messages can never be moderated" true through the SAME
// mechanism as every ban action, never a second, parallel authorization
// path that could drift out of sync.
//
// HARD DELETE — per the Phase 0 architecture audit's own recommendation
// (features/chat/services/global-chat.service.ts already establishes hard
// delete as this table's convention for its own cap-eviction cleanup;
// there is no soft-delete/history concept on GlobalChatMessage at all).
// The permanent record of "this message existed and was removed" lives
// entirely in the ModerationAction audit row created below (via
// recordMessageDeletion), keyed by targetResourceId = the deleted
// message's own id — never in the chat table itself.
//
// Order: validate reason -> resolve message -> authorize -> delete -> audit.
// Authorization deliberately runs AFTER resolving the message (needs the
// real owner's id to check hierarchy against) but BEFORE the delete
// itself, so a rejected attempt never touches the message row.
export async function deleteGlobalChatMessage(params: {
  actorPlayerId: string;
  messageId: string;
  reason: string;
}): Promise<DeleteGlobalChatMessageResult> {
  const reason = normalizeModerationReason(params.reason);
  if (reason === null) return { ok: false, error: "invalid-reason" };

  const message = await prisma.globalChatMessage.findUnique({ where: { id: params.messageId } });
  if (!message) return { ok: false, error: "message-not-found" };

  const authorization = await authorizeModerationAction({
    actorPlayerId: params.actorPlayerId,
    targetPlayerId: message.playerId,
    requiredPermission: "canDeleteChatMessages",
  });
  if (!authorization.ok) return { ok: false, error: authorization.error };

  await prisma.globalChatMessage.delete({ where: { id: params.messageId } });

  await recordMessageDeletion({
    targetPlayerId: message.playerId,
    actorPlayerId: params.actorPlayerId,
    targetResourceId: params.messageId,
    reason,
  });

  return { ok: true, deletedMessageId: params.messageId };
}
