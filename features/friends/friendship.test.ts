// FRIENDS PHASE 1 — focused coverage for the required security/access
// cases (this feature's own ticket, section 8) plus the request/accept/
// decline/notification flow. Runs the real service against the in-memory
// fake DB — same convention every other persistence-layer test in this
// codebase already establishes (see e.g. features/chat/global-chat.test.ts).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getFriendshipStatusBetween, getFriendsAndRequests, respondToFriendRequest, sendFriendRequest } from "@/features/friends/services/friendship.service";
import {
  getFriendshipRow,
  getFriendshipRowsForPlayer,
  getNotificationsFor,
  resetFakeDb,
  seedFriendship,
  seedPlayerProfile,
} from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "player-a", displayName: "אביב" });
  seedPlayerProfile({ id: "player-b", displayName: "נועה" });
  seedPlayerProfile({ id: "player-c", displayName: "דני" });
});

// 1
test("1: a player cannot send a friend request to themselves", async () => {
  const result = await sendFriendRequest("player-a", "player-a");
  assert.deepEqual(result, { ok: false, error: "self" });
  assert.equal(getFriendshipRowsForPlayer("player-a").length, 0);
});

// 2
test("2: a duplicate pending request (same direction) is rejected", async () => {
  const first = await sendFriendRequest("player-a", "player-b");
  assert.equal(first.ok, true);

  const second = await sendFriendRequest("player-a", "player-b");
  assert.deepEqual(second, { ok: false, error: "already-pending" });
  assert.equal(getFriendshipRowsForPlayer("player-a").length, 1, "no second row must ever be created");
});

// 3
test("3: an existing accepted friendship blocks a new request, from either side", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });

  const fromRequester = await sendFriendRequest("player-a", "player-b");
  assert.deepEqual(fromRequester, { ok: false, error: "already-friends" });

  const fromAddressee = await sendFriendRequest("player-b", "player-a");
  assert.deepEqual(fromAddressee, { ok: false, error: "already-friends" });

  assert.equal(getFriendshipRowsForPlayer("player-a").length, 1, "still exactly one relationship row for this pair");
});

// 4
test("4: the request recipient can accept", async () => {
  const sent = await sendFriendRequest("player-a", "player-b");
  assert.equal(sent.ok, true);
  const requestId = getFriendshipRowsForPlayer("player-a")[0]!.id;

  const result = await respondToFriendRequest("player-b", requestId, "accept");
  assert.deepEqual(result, { ok: true });

  const row = getFriendshipRow(requestId);
  assert.equal(row?.status, "accepted");
  assert.ok(row?.respondedAt, "respondedAt must be set on acceptance");
});

// 4b — decline
test("4b: the request recipient can decline, and the row is removed (freeing the pair for a future request)", async () => {
  await sendFriendRequest("player-a", "player-b");
  const requestId = getFriendshipRowsForPlayer("player-a")[0]!.id;

  const result = await respondToFriendRequest("player-b", requestId, "decline");
  assert.deepEqual(result, { ok: true });
  assert.equal(getFriendshipRow(requestId), undefined, "a declined request must not remain as a row");

  const resent = await sendFriendRequest("player-a", "player-b");
  assert.equal(resent.ok, true, "the same pair must be able to send a fresh request after a decline");
});

// 5
test("5: an unrelated user cannot accept or decline someone else's request", async () => {
  await sendFriendRequest("player-a", "player-b");
  const requestId = getFriendshipRowsForPlayer("player-a")[0]!.id;

  const unrelated = await respondToFriendRequest("player-c", requestId, "accept");
  assert.deepEqual(unrelated, { ok: false, error: "not-found" });

  // The REQUESTER themselves is also not the addressee — only player-b may
  // respond to their own incoming request.
  const requesterTryingToAccept = await respondToFriendRequest("player-a", requestId, "accept");
  assert.deepEqual(requesterTryingToAccept, { ok: false, error: "not-found" });

  const row = getFriendshipRow(requestId);
  assert.equal(row?.status, "pending", "the request must be completely untouched by an unauthorized responder");
});

// 6
test("6: friendship is unique regardless of direction — A already pending to B, B then requests A, resolves as ONE accepted relationship (never a duplicate)", async () => {
  const first = await sendFriendRequest("player-a", "player-b");
  assert.equal(first.ok, true);
  assert.equal(first.ok && first.autoAccepted, false);

  const second = await sendFriendRequest("player-b", "player-a");
  assert.equal(second.ok, true);
  assert.equal(second.ok && second.autoAccepted, true, "the reverse-direction send must resolve as an acceptance, not a new request");

  const rowsForA = getFriendshipRowsForPlayer("player-a");
  assert.equal(rowsForA.length, 1, "exactly one relationship row must exist for this pair, never A->B and B->A separately");
  assert.equal(rowsForA[0]?.status, "accepted");

  assert.equal(await getFriendshipStatusBetween("player-a", "player-b"), "friends");
  assert.equal(await getFriendshipStatusBetween("player-b", "player-a"), "friends");
});

// 6b — genuine concurrency
test("6b: two players requesting each other at the same instant still resolve to exactly one accepted relationship", async () => {
  const [resultA, resultB] = await Promise.all([sendFriendRequest("player-a", "player-b"), sendFriendRequest("player-b", "player-a")]);

  assert.equal(resultA.ok, true);
  assert.equal(resultB.ok, true);

  const rows = getFriendshipRowsForPlayer("player-a");
  assert.equal(rows.length, 1, "a concurrent double-send must never create two relationship rows for the same pair");
  assert.equal(rows[0]?.status, "accepted");
});

// 7 — notification integration.
test("7: sending a request creates exactly one FRIEND_REQUEST_RECEIVED notification for the addressee, naming the requester", async () => {
  await sendFriendRequest("player-a", "player-b");

  const notificationsForB = getNotificationsFor("player-b");
  assert.equal(notificationsForB.length, 1);
  assert.equal(notificationsForB[0]?.type, "FRIEND_REQUEST_RECEIVED");
  assert.ok(notificationsForB[0]?.message.includes("אביב"), "the notification must name the requester by their safe display name");

  assert.equal(getNotificationsFor("player-a").length, 0, "the requester themselves gets no notification for their own outgoing request");
});

test("7b: the auto-accept path (reverse-direction send) does not create a second notification", async () => {
  await sendFriendRequest("player-a", "player-b");
  await sendFriendRequest("player-b", "player-a");

  assert.equal(getNotificationsFor("player-b").length, 1, "only the original request should have ever notified anyone");
  assert.equal(getNotificationsFor("player-a").length, 0);
});

// getFriendsAndRequests — used by the Friends UI.
test("8: getFriendsAndRequests returns confirmed friends from either side, and only INCOMING pending requests", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  seedFriendship({ requesterId: "player-c", addresseeId: "player-a", status: "pending" });

  const view = await getFriendsAndRequests("player-a");
  assert.equal(view.friends.length, 1);
  assert.equal(view.friends[0]?.playerId, "player-b");
  assert.equal(view.friends[0]?.displayName, "נועה");

  assert.equal(view.incomingRequests.length, 1);
  assert.equal(view.incomingRequests[0]?.requesterPlayerId, "player-c");
  assert.equal(view.incomingRequests[0]?.requesterDisplayName, "דני");
});
