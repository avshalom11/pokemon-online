import "server-only";

import { createNotification } from "@/features/notifications/services/notification-service";
import { getOnlinePlayerIdSet } from "@/features/presence/services/presence.service";
import { getPlayerIdentitiesByIds, getPlayerProfilesByIds } from "@/lib/auth/player-profile";
import { prisma } from "@/lib/db/prisma";
import type {
  FriendSummary,
  FriendsAndRequestsView,
  FriendshipStatus,
  PendingFriendRequestView,
  RemoveFriendResult,
  RespondToFriendRequestResult,
  SendFriendRequestResult,
} from "@/features/friends/types";

// The canonical, order-independent key for a pair of players — the two ids
// sorted, joined by "::". Used as the friendship table's own unique index
// (prisma/schema.prisma's Friendship.friendPairKey), so "at most one
// relationship between any two players, ever, regardless of who sent it"
// is a real database-level guarantee, never merely an application-level
// check a race could slip past.
export function buildFriendPairKey(playerIdA: string, playerIdB: string): string {
  return [playerIdA, playerIdB].sort().join("::");
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

// The viewer's own relationship to a profile they're looking at
// (public-profile-view.service.ts's own getPublicProfileView, the ONE
// caller). `viewerPlayerId` is null for a logged-out/unresolvable viewer —
// returns "none" rather than throwing, since the profile page itself
// already gates real access behind auth; this is a defensive fallback, not
// the real auth boundary.
export async function getFriendshipStatusBetween(viewerPlayerId: string | null, targetPlayerId: string): Promise<FriendshipStatus> {
  const relation = await getFriendshipRelation(viewerPlayerId, targetPlayerId);
  return relation.status;
}

// Same relationship lookup as getFriendshipStatusBetween above, plus the
// underlying row's own id — the ONE extra thing AddFriendButton
// (features/friends/components/AddFriendButton.tsx) needs to let the
// viewer accept/decline a PENDING-INCOMING request directly from the
// sender's public profile (via the existing respondToFriendRequestAction —
// never a second accept/decline implementation). `requestId` is only ever
// non-null when status is "pending-incoming"; every other status has no
// actionable request to expose.
export async function getFriendshipRelation(
  viewerPlayerId: string | null,
  targetPlayerId: string
): Promise<{ status: FriendshipStatus; requestId: string | null }> {
  if (viewerPlayerId === null) return { status: "none", requestId: null };
  if (viewerPlayerId === targetPlayerId) return { status: "self", requestId: null };

  const row = await prisma.friendship.findUnique({ where: { friendPairKey: buildFriendPairKey(viewerPlayerId, targetPlayerId) } });
  if (!row) return { status: "none", requestId: null };
  if (row.status === "accepted") return { status: "friends", requestId: null };

  const isIncoming = row.requesterId !== viewerPlayerId;
  return { status: isIncoming ? "pending-incoming" : "pending-outgoing", requestId: isIncoming ? row.id : null };
}

// Sends a friend request from `requesterId` to `targetPlayerId` — both
// always already-resolved PlayerProfile ids from a trusted source (the
// caller's own session for requesterId; the public profile page's own
// server-resolved `view.playerId` for targetPlayerId — never a raw
// client-typed id trusted on its own beyond existence-checking below).
//
// CLEAN DUPLICATE HANDLING — if the OTHER player already has a pending
// request to the caller (A already asked B, and B is now the one calling
// this for A), this resolves as an ACCEPTANCE of that existing row rather
// than ever attempting to create a second relationship for the same pair —
// per this feature's own spec. A request already pending in the SAME
// direction, or an already-accepted friendship, are both rejected as
// distinct, named errors instead.
//
// RACE-SAFETY — two players requesting each other at the exact same
// instant can both reach the "no existing row" branch before either
// commits; the friendPairKey unique index (prisma/schema.prisma) means
// only one INSERT can ever succeed. The loser's create fails with a real
// P2002, which is caught here and resolved by simply re-running this same
// function — the second pass now finds the winner's row and falls into
// the ordinary "already-pending" or auto-accept branch above, exactly as
// if the two requests had arrived a moment apart instead of simultaneously.
export async function sendFriendRequest(requesterId: string, targetPlayerId: string): Promise<SendFriendRequestResult> {
  if (requesterId === targetPlayerId) return { ok: false, error: "self" };

  const pairKey = buildFriendPairKey(requesterId, targetPlayerId);
  const existing = await prisma.friendship.findUnique({ where: { friendPairKey: pairKey } });

  if (existing) {
    if (existing.status === "accepted") return { ok: false, error: "already-friends" };
    if (existing.requesterId === requesterId) return { ok: false, error: "already-pending" };

    await prisma.friendship.update({ where: { id: existing.id }, data: { status: "accepted", respondedAt: new Date() } });
    return { ok: true, autoAccepted: true };
  }

  const targetProfile = await prisma.playerProfile.findUnique({ where: { id: targetPlayerId } });
  if (!targetProfile) return { ok: false, error: "not-found" };

  try {
    await prisma.$transaction(async (tx) => {
      const friendship = await tx.friendship.create({
        data: { requesterId, addresseeId: targetPlayerId, friendPairKey: pairKey, status: "pending" },
      });

      const displayNames = await getPlayerProfilesByIds([requesterId]);
      const requesterName = displayNames.get(requesterId) ?? "שחקן";
      // FRIENDS QUICK ACTIONS — carries the request's own id so
      // NotificationBell.tsx can render real אשר/לא מאשר buttons directly
      // inline, calling the exact same respondToFriendRequestAction this
      // module's own respondToFriendRequest is already the one
      // implementation behind — never a duplicated accept/decline path.
      await createNotification(tx, targetPlayerId, "FRIEND_REQUEST_RECEIVED", `${requesterName} שלח/ה לך בקשת חברות`, {
        requestId: friendship.id,
        requesterPlayerId: requesterId,
      });
    });
    return { ok: true, autoAccepted: false };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return sendFriendRequest(requesterId, targetPlayerId);
    }
    throw error;
  }
}

// Accept or decline an INCOMING request — `playerId` is always the
// caller's own resolved PlayerProfile id (never trusted from the client),
// and must be the request's own addressee for this to succeed: the
// requester of their own outgoing request, or any unrelated third player,
// both get the same "not-found" result as a request that genuinely
// doesn't exist — never a distinct "forbidden" signal that would confirm
// a guessed requestId belongs to someone else's real request.
//
// A decline DELETES the row outright rather than recording a "declined"
// status — see the Friendship model's own doc comment (prisma/
// schema.prisma) for why: it's what lets the same pair send a fresh
// request again later without this feature needing a partial/filtered
// unique index Prisma's schema DSL can't express.
export async function respondToFriendRequest(
  playerId: string,
  requestId: string,
  action: "accept" | "decline"
): Promise<RespondToFriendRequestResult> {
  const row = await prisma.friendship.findUnique({ where: { id: requestId } });
  if (!row || row.addresseeId !== playerId || row.status !== "pending") {
    return { ok: false, error: "not-found" };
  }

  if (action === "accept") {
    await prisma.friendship.update({ where: { id: requestId }, data: { status: "accepted", respondedAt: new Date() } });
  } else {
    await prisma.friendship.deleteMany({ where: { id: requestId } });
  }

  return { ok: true };
}

// REMOVE FRIEND — a genuinely different operation from declining a pending
// request (respondToFriendRequest above): this only ever touches a row
// that is currently "accepted", requires the caller to be one of the
// two actual friends (requester OR addressee — friendship has no
// direction once accepted), and — like a decline — DELETES the row
// outright rather than recording a "removed" status. That deletion is
// exactly what makes every downstream authorization check correct for
// free: areFriends() below (private-chat.service.ts's own
// getOrCreateConversation gate, and now sendPrivateMessage's own send
// gate — see that function's own doc comment) reads "friendPairKey exists
// AND status === accepted", so the instant this row is gone, both of
// those correctly deny the pair again — no separate "removed" flag to
// keep in sync, no risk of one check trusting a stale copy. Deleting
// (rather than soft-removing) also frees the friendPairKey for a future
// fresh request between the same two players, same reasoning
// respondToFriendRequest's own decline branch already documents.
//
// Never touches PrivateConversation/PrivateMessage rows — chat history is
// deliberately preserved regardless of friendship status (this feature's
// own explicit spec); only future authorization is affected, never past
// data.
//
// AUTHORIZATION — `playerId` is always the caller's own resolved
// PlayerProfile id (never trusted from the client). The row must both
// exist, be "accepted", AND have `playerId` as one of its two sides,
// checked all at once with the SAME "not-found" result for every failure
// mode (unrelated third player, a still-pending request, a
// nonexistent/already-removed pair) — never a distinct "forbidden" signal
// that would confirm a guessed pair actually exists.
export async function removeFriend(playerId: string, otherPlayerId: string): Promise<RemoveFriendResult> {
  const row = await prisma.friendship.findUnique({ where: { friendPairKey: buildFriendPairKey(playerId, otherPlayerId) } });
  const isRealParticipant = row !== null && (row.requesterId === playerId || row.addresseeId === playerId);
  if (!row || !isRealParticipant || row.status !== "accepted") {
    return { ok: false, error: "not-found" };
  }

  await prisma.friendship.deleteMany({ where: { id: row.id } });
  return { ok: true };
}

// The Friends UI's one data source — confirmed friends (from EITHER side of
// the relationship, since friendship is symmetric) and incoming pending
// requests only (never the caller's own outgoing pending requests — Phase 1
// has no "cancel a sent request" UI, so there's nothing actionable to show
// for those yet).
export async function getFriendsAndRequests(playerId: string): Promise<FriendsAndRequestsView> {
  const [asRequesterAccepted, asAddresseeAccepted, incomingPending] = await Promise.all([
    prisma.friendship.findMany({ where: { requesterId: playerId, status: "accepted" } }),
    prisma.friendship.findMany({ where: { addresseeId: playerId, status: "accepted" } }),
    prisma.friendship.findMany({ where: { addresseeId: playerId, status: "pending" }, orderBy: { createdAt: "desc" } }),
  ]);

  const friendPlayerIds = [
    ...asRequesterAccepted.map((row: { addresseeId: string }) => row.addresseeId),
    ...asAddresseeAccepted.map((row: { requesterId: string }) => row.requesterId),
  ];
  const requesterIds = incomingPending.map((row: { requesterId: string }) => row.requesterId);

  const [identities, onlinePlayerIds] = await Promise.all([
    getPlayerIdentitiesByIds([...friendPlayerIds, ...requesterIds]),
    // ONLINE PRESENCE — only confirmed friends need a status dot (the
    // Friends Bar's own spec); recomputed fresh on every read, so it stays
    // live purely off FriendsDataProvider's own existing poll.
    getOnlinePlayerIdSet(friendPlayerIds),
  ]);

  const friends: FriendSummary[] = friendPlayerIds.map((id) => ({
    playerId: id,
    displayName: identities.get(id)?.displayName ?? "שחקן",
    username: identities.get(id)?.username ?? null,
    isOnline: onlinePlayerIds.has(id),
  }));
  const incomingRequests: PendingFriendRequestView[] = incomingPending.map((row: { id: string; requesterId: string }) => ({
    requestId: row.id,
    requesterPlayerId: row.requesterId,
    requesterDisplayName: identities.get(row.requesterId)?.displayName ?? "שחקן",
    requesterUsername: identities.get(row.requesterId)?.username ?? null,
  }));

  return { friends, incomingRequests };
}

// Whether `playerId` and `otherPlayerId` are confirmed friends — the one
// authorization primitive private-chat.service.ts gates every read/write on
// (getOrCreateConversation, and indirectly every later message operation
// via conversation participancy).
export async function areFriends(playerId: string, otherPlayerId: string): Promise<boolean> {
  const row = await prisma.friendship.findUnique({ where: { friendPairKey: buildFriendPairKey(playerId, otherPlayerId) } });
  return row?.status === "accepted";
}
