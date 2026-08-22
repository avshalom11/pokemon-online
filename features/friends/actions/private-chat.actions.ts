"use server";

import { getConversationMessages, getOrCreateConversation, sendPrivateMessage } from "@/features/friends/services/private-chat.service";
import type { OpenConversationResult, PrivateMessageView, SendPrivateMessageResult } from "@/features/friends/types";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// Thin Server Action wrappers — same shape as friendship.actions.ts.
// friendPlayerId/conversationId are always re-validated against the
// caller's own real session-resolved playerId inside the service layer
// (areFriends / conversation-participant checks) — never trusted outright
// just because the client sent them.
//
// Deliberately never touches ActiveBattleProvider or any battle-session
// state — same guarantee features/chat/actions/global-chat.actions.ts's
// own doc comment establishes for Global Chat.

export async function openConversationAction(friendPlayerId: string): Promise<OpenConversationResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "unauthenticated" };

  const profile = await getPlayerProfile(session.user.id);
  return getOrCreateConversation(profile.id, friendPlayerId);
}

// The client's poll target for the ONE currently-open conversation — never
// called for every friendship at once (see use-private-chat.ts, the only
// caller).
export async function getConversationMessagesAction(conversationId: string): Promise<PrivateMessageView[]> {
  const session = await getCurrentSession();
  if (!session) return [];

  const profile = await getPlayerProfile(session.user.id);
  const messages = await getConversationMessages(profile.id, conversationId);
  return messages ?? [];
}

export async function sendPrivateMessageAction(conversationId: string, rawMessage: string): Promise<SendPrivateMessageResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "unauthenticated" };

  const profile = await getPlayerProfile(session.user.id);
  return sendPrivateMessage(profile.id, conversationId, rawMessage);
}
