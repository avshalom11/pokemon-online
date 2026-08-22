// FRIENDS + PRIVATE CHAT — QUICK ACTIONS & BOTTOM-RIGHT FRIENDS BAR —
// focused coverage for this task's own 16 requirements. Behavioral checks
// run the real friendship/private-chat services against the in-memory fake
// DB; UI-wiring facts with no natural service-level assertion (minimize/
// expand toggles, popup dedup/suppression logic, positioning) are checked
// at the source level — this project's established convention (see e.g.
// features/friends/friends-ux.test.ts).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { respondToFriendRequest, sendFriendRequest } from "@/features/friends/services/friendship.service";
import { sendPrivateMessage } from "@/features/friends/services/private-chat.service";
import { getFriendshipRow, getNotificationsFor, resetFakeDb, seedFriendship, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "player-a", displayName: "אביב", username: "aviv" });
  seedPlayerProfile({ id: "player-b", displayName: "נועה", username: "noa" });
});

const notificationBellSrc = fs.readFileSync("features/notifications/components/NotificationBell.tsx", "utf8");
const addFriendButtonSrc = fs.readFileSync("features/friends/components/AddFriendButton.tsx", "utf8");
const friendsBarSrc = fs.readFileSync("features/friends/components/FriendsBar.tsx", "utf8");
const popupWatcherSrc = fs.readFileSync("features/friends/components/PrivateMessagePopupWatcher.tsx", "utf8");
const friendsDataContextSrc = fs.readFileSync("features/friends/context/friends-data-context.tsx", "utf8");
const globalChatBarSrc = fs.readFileSync("features/chat/components/GlobalChatBar.tsx", "utf8");
const globalChatServiceSrc = fs.readFileSync("features/chat/services/global-chat.service.ts", "utf8");

// 1 — incoming friend-request notification shows accept/decline.
test("1: (source) NotificationBell renders אשר חברות / לא מאשר inline for a FRIEND_REQUEST_RECEIVED notification", () => {
  assert.ok(notificationBellSrc.includes('notification.type === "FRIEND_REQUEST_RECEIVED"'));
  assert.ok(notificationBellSrc.includes("אשר חברות"));
  assert.ok(notificationBellSrc.includes("לא מאשר"));
  assert.ok(notificationBellSrc.includes("notification.metadata?.requestId"), "the request id must come from the notification's own metadata");
  assert.ok(notificationBellSrc.includes("useFriendsData"), "must reuse the shared respondToRequest, never a duplicated implementation");
});

// 2 — accept from notification creates friendship.
test("2: the requestId carried in a FRIEND_REQUEST_RECEIVED notification's metadata really accepts the friendship", async () => {
  await sendFriendRequest("player-a", "player-b");
  const notification = getNotificationsFor("player-b")[0];
  const requestId = (notification?.metadata as { requestId?: string } | null)?.requestId;
  assert.ok(requestId, "the notification must carry a real requestId");

  const result = await respondToFriendRequest("player-b", requestId!, "accept");
  assert.deepEqual(result, { ok: true });
  assert.equal(getFriendshipRow(requestId!)?.status, "accepted");
});

// 3 — decline from notification removes pending request.
test("3: declining via the notification's own requestId removes the pending request entirely", async () => {
  await sendFriendRequest("player-a", "player-b");
  const notification = getNotificationsFor("player-b")[0];
  const requestId = (notification?.metadata as { requestId?: string } | null)?.requestId;

  const result = await respondToFriendRequest("player-b", requestId!, "decline");
  assert.deepEqual(result, { ok: true });
  assert.equal(getFriendshipRow(requestId!), undefined, "a declined request must not remain as a row");
});

// 4 — incoming pending request on profile shows accept/decline (already
// proven end to end by public-profile-view.test.ts's own 5b; this checks
// the UI actually renders the two required buttons for that state).
test("4: (source) AddFriendButton's pending-incoming branch renders both accept and decline", () => {
  assert.match(addFriendButtonSrc, /status === "pending-incoming" && incomingFriendRequestId/);
  assert.ok(addFriendButtonSrc.includes("אשר חברות"));
  assert.ok(addFriendButtonSrc.includes("לא מאשר"));
});

// 5 — sent-request profile state remains "בקשת חברות נשלחה".
test("5: (source) AddFriendButton's pending-outgoing branch shows the exact required label", () => {
  assert.match(addFriendButtonSrc, /status === "pending-outgoing"[\s\S]{0,400}בקשת חברות נשלחה/);
});

// 6 — accepted-friend profile state offers "הפסק חברות" (superseded by
// FRIENDS BAR POSITION + REMOVE FRIEND FLOW's own section 5 — a friend's
// profile now shows a clear remove action instead of a static "friends"
// label).
test("6: (source) AddFriendButton's friends branch offers הפסק חברות via the shared confirmation flow", () => {
  const friendsBranchIndex = addFriendButtonSrc.indexOf('status === "friends"');
  const removeLabelIndex = addFriendButtonSrc.indexOf("הפסק חברות");
  assert.ok(friendsBranchIndex >= 0 && removeLabelIndex > friendsBranchIndex, "the friends branch must render the הפסק חברות label");
  assert.ok(addFriendButtonSrc.includes("RemoveFriendConfirmation"), "must reuse the shared confirmation dialog");
  assert.ok(addFriendButtonSrc.includes("useRemoveFriend"), "must reuse the shared removal hook, never a duplicated implementation");
});

// 7 — Friends bar shows accepted friends only.
test("7: (source) FriendsBar reads only `friends` (accepted) from the shared context, never incomingRequests", () => {
  assert.ok(friendsBarSrc.includes("useFriendsData"));
  assert.match(friendsBarSrc, /const \{ friends \} = useFriendsData\(\)/, "must destructure only the accepted-friends list");
  assert.ok(!friendsBarSrc.includes("incomingRequests"), "the Friends bar must never render pending requests");
});

// 8 — clicking friend opens private chat.
test("8: (source) clicking a friend row in the Friends bar calls the shared openChat, never a route navigation", () => {
  assert.ok(friendsBarSrc.includes("usePrivateChatWindow"));
  assert.match(friendsBarSrc, /onClick=\{\(\) => openChat\(friend\.playerId, friend\.displayName\)\}/);
  assert.ok(!friendsBarSrc.includes("next/link"), "must not navigate to a separate chat page");
});

// 9 — Friends bar minimizes/restores.
test("9: (source) the Friends bar has its own independent collapse/expand toggle", () => {
  assert.match(friendsBarSrc, /const \[isExpanded, setIsExpanded\] = useState\(false\)/, "must default to collapsed");
  assert.ok(friendsBarSrc.includes("setIsExpanded(true)"));
  assert.ok(friendsBarSrc.includes("setIsExpanded(false)"));
});

// 10 — incoming private message creates one popup (the underlying
// notification-creation/dedup guarantee is already proven end to end by
// private-chat.test.ts's own 10/11; this confirms the popup watcher's own
// one-notification-per-toast wiring).
test("10: a private message still creates exactly one PRIVATE_MESSAGE_RECEIVED notification, with a senderDisplayName the popup can render", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const { getOrCreateConversation } = await import("@/features/friends/services/private-chat.service");
  const opened = await getOrCreateConversation("player-a", "player-b");
  assert.equal(opened.ok, true);

  await sendPrivateMessage("player-a", opened.ok ? opened.conversation.conversationId : "", "היי!");

  const notifications = getNotificationsFor("player-b");
  assert.equal(notifications.length, 1);
  const metadata = notifications[0]?.metadata as { conversationId?: string; senderPlayerId?: string; senderDisplayName?: string } | null;
  assert.equal(metadata?.senderPlayerId, "player-a");
  assert.equal(metadata?.senderDisplayName, "אביב");
});

test("10b: (source) PrivateMessagePopupWatcher polls the existing notification action, never a new dedicated query or WebSocket", () => {
  assert.ok(popupWatcherSrc.includes("getNotificationBellDataAction"), "must reuse the existing bell-data query, not a second one");
  // Checks actual USAGE (a real WebSocket construction), not a blanket
  // "websocket" substring ban — this file's own doc comment legitimately
  // says "no WebSockets" in prose.
  assert.ok(!popupWatcherSrc.includes("new WebSocket("), "must never construct a real WebSocket");
  assert.ok(popupWatcherSrc.includes("setInterval"), "must use the same lightweight polling pattern as Global/Private Chat");
});

// 11 — clicking popup opens sender's chat.
test("11: (source) clicking a toast calls the shared openChat with the sender's id/name", () => {
  assert.ok(popupWatcherSrc.includes("usePrivateChatWindow"));
  assert.match(popupWatcherSrc, /openChat\(toast\.senderPlayerId, toast\.senderDisplayName\)/);
});

// 12 — same notification is not shown repeatedly.
test("12: (source) each notification id is only ever evaluated/shown once, via a persistent seen-ids set", () => {
  assert.match(popupWatcherSrc, /seenIdsRef\.current\.has\(notification\.id\)/, "must check before ever showing a toast");
  assert.match(popupWatcherSrc, /seenIdsRef\.current\.add\(notification\.id\)/, "must record it immediately, before deciding whether to display it");
  assert.ok(
    popupWatcherSrc.includes("seenIdsRef.current === null"),
    "the first poll after mount must seed already-existing unread notifications WITHOUT popping them up retroactively"
  );
});

// 13 — open chat suppresses duplicate popup spam (client-side, via
// PrivateChatWindowContext — never server-side presence, per the ticket's
// own explicit instruction).
test("13: (source) a toast for the currently-open, non-minimized conversation is suppressed using only client-side PrivateChatWindowContext state", () => {
  assert.ok(popupWatcherSrc.includes("activeConversationRef"));
  assert.ok(popupWatcherSrc.includes("isMinimizedRef"));
  assert.match(popupWatcherSrc, /activeConversationRef\.current\?\.conversationId === metadata\.conversationId && !isMinimizedRef\.current/);
  // Checks actual USAGE (a presence-tracking API/write), not a blanket
  // "presence" substring ban — this file's own doc comment legitimately
  // explains it deliberately avoids server-side presence, in prose.
  assert.ok(!popupWatcherSrc.includes("prisma."), "must never touch the database for presence — suppression is purely client-side context state");
});

// 14 — friend-list refreshes after accept/decline (own-profile accept,
// notification accept, decline, becoming friends) without a full reload.
test("14: (source) every accept/decline surface shares the ONE FriendsDataProvider, so a mutation from any of them is visible everywhere", () => {
  for (const src of [notificationBellSrc, addFriendButtonSrc, friendsBarSrc]) {
    assert.ok(src.includes("useFriendsData"), "every friends-UI surface must read from the shared context, not its own copy");
  }
  assert.ok(friendsDataContextSrc.includes("respondToRequest"));
  assert.ok(friendsDataContextSrc.includes("refresh"));
  // No component re-implements the fetch/mutation itself — it always goes
  // through the context's own functions.
  assert.ok(!friendsBarSrc.includes("getFriendsAndRequestsAction"), "FriendsBar must never fetch its own copy of the data");
});

// 15 — Global Chat remains untouched.
test("15: (source) Global Chat has no dependency on this task's new friends surfaces", () => {
  for (const src of [globalChatBarSrc, globalChatServiceSrc]) {
    assert.ok(!src.includes("FriendsBar"));
    assert.ok(!src.includes("FriendsDataProvider"));
    assert.ok(!src.includes("PrivateMessagePopupWatcher"));
  }
});

// 16 — battle lock remains untouched.
test("16: (source) the new Friends bar/popup/context never read or modify ActiveBattleProvider/battle-lock state", () => {
  for (const src of [friendsBarSrc, popupWatcherSrc, friendsDataContextSrc, notificationBellSrc]) {
    assert.ok(!src.includes("useActiveBattle("), "must never call useActiveBattle");
    assert.ok(!src.includes("setActiveBattle("), "must never call setActiveBattle");
    assert.ok(!src.includes("active-battle-context"), "must never import the battle-lock context module");
  }
});
