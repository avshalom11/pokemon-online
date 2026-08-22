"use server";

import { getRecentGlobalChatMessages, sendGlobalChatMessage } from "@/features/chat/services/global-chat.service";
import type { GlobalChatMessageView, SendGlobalChatMessageResult } from "@/features/chat/types";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// Both thin Server Action wrappers — same shape as every other action file
// in this codebase (resolve the session, resolve the profile, delegate to
// the service). Ownership/identity is never trusted from the client: the
// sender is always this request's own real session, never a client-passed
// playerId.
//
// Deliberately never touches ActiveBattleProvider or any battle-session
// state — GlobalChatBar (features/chat/components/GlobalChatBar.tsx) is a
// fully independent client component that only ever calls these two
// actions, so sending/polling chat can never affect battle navigation
// locks.

// Only an authenticated player may send. An unauthenticated caller (should
// never actually happen — the chat only renders inside the authenticated
// (game) layout — but a Server Action is still a real network endpoint
// anyone could call directly) is rejected exactly like any other invalid
// send, never throwing.
export async function sendGlobalChatMessageAction(rawMessage: string): Promise<SendGlobalChatMessageResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "unauthenticated" };

  const profile = await getPlayerProfile(session.user.id);
  return sendGlobalChatMessage(profile.id, rawMessage);
}

// The client bar's poll target — a plain read, safe to call on an interval.
// Returns an empty list rather than throwing for an unauthenticated caller,
// same defensive shape as sendGlobalChatMessageAction above.
export async function getGlobalChatMessagesAction(): Promise<GlobalChatMessageView[]> {
  const session = await getCurrentSession();
  if (!session) return [];

  return getRecentGlobalChatMessages();
}
