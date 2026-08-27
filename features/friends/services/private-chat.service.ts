import "server-only";

import { PRIVATE_CHAT_MAX_MESSAGES, PRIVATE_CHAT_MESSAGE_MAX_LENGTH } from "@/features/friends/config/friends.config";
import { areFriends, buildFriendPairKey } from "@/features/friends/services/friendship.service";
import type { OpenConversationResult, PrivateMessageView, SendPrivateMessageResult } from "@/features/friends/types";
import { createNotification } from "@/features/notifications/services/notification-service";
import { getPlayerIdentitiesByIds, type PlayerIdentity } from "@/lib/auth/player-profile";
import { formatChatMessageTimestamp } from "@/lib/chat/format-message-timestamp";
import { prisma } from "@/lib/db/prisma";

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

function toMessageView(
  row: { id: string; senderId: string; message: string; createdAt: Date },
  identityBySenderId: Map<string, PlayerIdentity>
): PrivateMessageView {
  const identity = identityBySenderId.get(row.senderId);
  return {
    id: row.id,
    playerDisplayName: identity?.displayName ?? "שחקן",
    playerUsername: identity?.username ?? null,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    sentTimeLabel: formatChatMessageTimestamp(row.createdAt),
  };
}

// The ONE authorization primitive every read/write below is gated on:
// returns the conversation row only if `playerId` is genuinely one of its
// two participants, null otherwise (unknown conversation id, or a real
// conversation belonging to two OTHER players — both indistinguishable to
// the caller, same "not-found, never a distinguishing forbidden" idiom
// friendship.service.ts's respondToFriendRequest already establishes). A
// client-supplied conversationId can never bypass this: even a guessed,
// real id only ever returns data if the guesser is actually a participant.
async function getConversationIfParticipant(
  conversationId: string,
  playerId: string
): Promise<{ id: string; playerAId: string; playerBId: string } | null> {
  const conversation = await prisma.privateConversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return null;
  if (conversation.playerAId !== playerId && conversation.playerBId !== playerId) return null;
  return conversation;
}

// Resolves — creating on first contact if necessary — the ONE conversation
// between `playerId` and `friendPlayerId`. Never creates (or returns) one
// for a non-friend pair: areFriends is re-checked here every time, not
// merely trusted from whatever screen the client navigated from.
//
// RACE-SAFETY — the pair's conversationPairKey unique index
// (prisma/schema.prisma) means two friends opening the chat for the first
// time at the same instant can't both create separate rows: the loser's
// create fails with a real P2002, caught here and resolved by re-reading
// the winner's own row — same create-then-catch-P2002 idiom
// friendship.service.ts's sendFriendRequest already uses for the same
// reason.
export async function getOrCreateConversation(playerId: string, friendPlayerId: string): Promise<OpenConversationResult> {
  if (playerId === friendPlayerId || !(await areFriends(playerId, friendPlayerId))) {
    return { ok: false, error: "not-friends" };
  }

  const pairKey = buildFriendPairKey(playerId, friendPlayerId);
  let conversation = await prisma.privateConversation.findUnique({ where: { conversationPairKey: pairKey } });

  if (!conversation) {
    const [playerAId, playerBId] = [playerId, friendPlayerId].sort();
    try {
      conversation = await prisma.privateConversation.create({ data: { playerAId, playerBId, conversationPairKey: pairKey } });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      conversation = await prisma.privateConversation.findUnique({ where: { conversationPairKey: pairKey } });
      if (!conversation) throw error;
    }
  }

  const messages = await getConversationMessages(playerId, conversation.id);
  if (!messages) return { ok: false, error: "not-friends" };

  const identities = await getPlayerIdentitiesByIds([friendPlayerId]);
  const friendIdentity = identities.get(friendPlayerId);
  return {
    ok: true,
    conversation: {
      conversationId: conversation.id,
      friendPlayerId,
      friendDisplayName: friendIdentity?.displayName ?? "שחקן",
      friendUsername: friendIdentity?.username ?? null,
      messages,
    },
  };
}

// The client bar's poll target — a plain, read-only, participant-gated
// fetch. Returns null (never throws, never a partial/best-effort list) for
// any caller who isn't a real participant of this exact conversation,
// including a guessed-but-real conversationId belonging to two other
// players.
export async function getConversationMessages(playerId: string, conversationId: string): Promise<PrivateMessageView[] | null> {
  const conversation = await getConversationIfParticipant(conversationId, playerId);
  if (!conversation) return null;

  const rows = await prisma.privateMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: PRIVATE_CHAT_MAX_MESSAGES,
  });
  const ascending = [...rows].reverse();
  const identities = await getPlayerIdentitiesByIds([...new Set(ascending.map((row: { senderId: string }) => row.senderId))]);
  return ascending.map((row: { id: string; senderId: string; message: string; createdAt: Date }) => toMessageView(row, identities));
}

// Validates, authorizes, inserts, then trims THIS conversation back down to
// its newest PRIVATE_CHAT_MAX_MESSAGES rows — every delete is scoped by
// `conversationId` (both the count and the "N oldest" lookup below), so
// trimming one conversation can never remove a message belonging to
// another — same architecture as Global Chat's own
// sendGlobalChatMessage (global-chat.service.ts), just scoped per
// conversation instead of globally.
//
// PRIVATE MESSAGE NOTIFICATION (reuses the existing Notification system —
// notification-service.ts — never a second one) — the recipient gets a
// PRIVATE_MESSAGE_RECEIVED notification unless they already have an UNREAD
// one for this exact conversationId, in which case this send just leaves
// that existing notification as-is rather than creating a pile of
// duplicates during a fast back-and-forth exchange. That "already unread
// for this conversation" check is the only spam-avoidance this project's
// architecture can determine RELIABLY: it's a real, persisted fact
// (Notification.isRead + its own metadata.conversationId), not a live
// "is the recipient actually looking at this chat right now" signal —
// this app has no server-side presence/WebSocket layer, and this feature
// was explicitly scoped to not invent one. A recipient who has this exact
// conversation open and polling will therefore still receive a
// notification for a first new message after their last read, exactly the
// same as if they were looking at any other page — a deliberate, documented
// limitation of the simpler/safe fallback this ticket authorized, not an
// oversight. Opening the notification bell (markAllNotificationsRead)
// clears the unread flag, so the very next message after that naturally
// creates a fresh notification again.
export async function sendPrivateMessage(playerId: string, conversationId: string, rawMessage: string): Promise<SendPrivateMessageResult> {
  const conversation = await getConversationIfParticipant(conversationId, playerId);
  if (!conversation) return { ok: false, error: "not-a-participant" };

  // REMOVE FRIEND — SECURITY. Being a real conversation participant is
  // necessary but no longer SUFFICIENT to send: a conversation, once
  // created, is never deleted when a friendship ends (chat history is
  // deliberately preserved — see removeFriend's own doc comment,
  // friendship.service.ts), so without this check a former friend could
  // keep sending into an old conversation forever. areFriends() reads the
  // SAME Friendship row getOrCreateConversation's own gate already relies
  // on, so the instant a friendship is removed, both the "reopen" path and
  // this "send" path are denied together — never two independently-tracked
  // authorization facts that could drift out of sync.
  const otherPlayerId = conversation.playerAId === playerId ? conversation.playerBId : conversation.playerAId;
  if (!(await areFriends(playerId, otherPlayerId))) {
    return { ok: false, error: "not-friends" };
  }

  const trimmed = rawMessage.trim();
  if (trimmed.length === 0) return { ok: false, error: "empty" };
  if (trimmed.length > PRIVATE_CHAT_MESSAGE_MAX_LENGTH) return { ok: false, error: "too-long" };

  const recipientId = conversation.playerAId === playerId ? conversation.playerBId : conversation.playerAId;
  const identities = await getPlayerIdentitiesByIds([playerId]);
  const senderDisplayName = identities.get(playerId)?.displayName ?? "שחקן";

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.privateMessage.create({ data: { conversationId, senderId: playerId, message: trimmed } });

    const total = await tx.privateMessage.count({ where: { conversationId } });
    const excess = total - PRIVATE_CHAT_MAX_MESSAGES;
    if (excess > 0) {
      const oldest = await tx.privateMessage.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" }, take: excess });
      if (oldest.length > 0) {
        await tx.privateMessage.deleteMany({
          where: { id: { in: oldest.map((message: { id: string }) => message.id) }, conversationId },
        });
      }
    }

    const existingUnread = await tx.notification.findMany({
      where: { playerId: recipientId, type: "PRIVATE_MESSAGE_RECEIVED", isRead: false },
    });
    const alreadyNotifiedForThisConversation = existingUnread.some((notification: { metadata: unknown }) => {
      const metadata = notification.metadata;
      return metadata !== null && typeof metadata === "object" && (metadata as { conversationId?: unknown }).conversationId === conversationId;
    });
    if (!alreadyNotifiedForThisConversation) {
      // FRIENDS QUICK ACTIONS — senderDisplayName added alongside the
      // existing conversationId/senderPlayerId pair, purely so
      // PrivateMessagePopupWatcher.tsx's own toast can say "הודעה חדשה
      // מ־<name>" without a second lookup — never re-derived or duplicated
      // anywhere else.
      await createNotification(tx, recipientId, "PRIVATE_MESSAGE_RECEIVED", `${senderDisplayName} שלח/ה לך הודעה פרטית`, {
        conversationId,
        senderPlayerId: playerId,
        senderDisplayName,
      });
    }

    return row;
  });

  return { ok: true, message: toMessageView(created, identities) };
}
