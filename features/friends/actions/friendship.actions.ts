"use server";

import { getFriendsAndRequests, removeFriend, respondToFriendRequest, sendFriendRequest } from "@/features/friends/services/friendship.service";
import type {
  FriendsAndRequestsView,
  RemoveFriendResult,
  RespondToFriendRequestResult,
  SendFriendRequestResult,
} from "@/features/friends/types";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// Thin Server Action wrappers — same shape as every other action file in
// this codebase (resolve the session, resolve the profile, delegate to the
// service). Identity is never trusted from the client: the requester/
// responder is always this request's own real session.

export async function sendFriendRequestAction(targetPlayerId: string): Promise<SendFriendRequestResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "unauthenticated" };

  const profile = await getPlayerProfile(session.user.id);
  return sendFriendRequest(profile.id, targetPlayerId);
}

export async function respondToFriendRequestAction(
  requestId: string,
  action: "accept" | "decline"
): Promise<RespondToFriendRequestResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "unauthenticated" };

  const profile = await getPlayerProfile(session.user.id);
  return respondToFriendRequest(profile.id, requestId, action);
}

// REMOVE FRIEND — otherPlayerId is the friend being removed; ownership is
// resolved server-side from the session exactly like every other action
// here, never trusted from the client. See removeFriend's own doc comment
// (friendship.service.ts) for the full authorization/deletion contract.
export async function removeFriendAction(otherPlayerId: string): Promise<RemoveFriendResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "unauthenticated" };

  const profile = await getPlayerProfile(session.user.id);
  return removeFriend(profile.id, otherPlayerId);
}

// The Friends page's own data source, also re-callable client-side after
// an accept/decline so the list refreshes without a full page reload.
export async function getFriendsAndRequestsAction(): Promise<FriendsAndRequestsView> {
  const session = await getCurrentSession();
  if (!session) return { friends: [], incomingRequests: [] };

  const profile = await getPlayerProfile(session.user.id);
  return getFriendsAndRequests(profile.id);
}
