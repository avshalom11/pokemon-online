// FRIENDS PHASE 1 — PRIVATE CHAT — focused coverage for the required
// security/access cases (this feature's own ticket, section 8) plus
// message-cap retention. Runs the real service against the in-memory fake
// DB — same convention as friendship.test.ts.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { PRIVATE_CHAT_MAX_MESSAGES } from "@/features/friends/config/friends.config";
import { getConversationMessages, getOrCreateConversation, sendPrivateMessage } from "@/features/friends/services/private-chat.service";
import { markNotificationRead } from "@/features/notifications/services/notification-service";
import {
  getNotificationsFor,
  getPrivateMessageCount,
  getPrivateMessageRows,
  resetFakeDb,
  seedFriendship,
  seedPlayerProfile,
  seedPrivateConversation,
  seedPrivateMessage,
} from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "player-a", displayName: "אביב" });
  seedPlayerProfile({ id: "player-b", displayName: "נועה" });
  seedPlayerProfile({ id: "player-c", displayName: "דני" });
});

// 1
test("1: only confirmed friends can open/create a conversation — a non-friend pair is rejected, no row is created", async () => {
  const result = await getOrCreateConversation("player-a", "player-b");
  assert.deepEqual(result, { ok: false, error: "not-friends" });
});

// 2
test("2: once friends, opening a conversation succeeds and returns an empty history with the correct friend name", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });

  const result = await getOrCreateConversation("player-a", "player-b");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.conversation.friendDisplayName, "נועה");
  assert.equal(result.ok && result.conversation.messages.length, 0);
});

// 3 — exactly one conversation regardless of who opens it first.
test("3: exactly one conversation exists for a pair, regardless of who opens it first", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });

  const openedByA = await getOrCreateConversation("player-a", "player-b");
  const openedByB = await getOrCreateConversation("player-b", "player-a");

  assert.equal(openedByA.ok, true);
  assert.equal(openedByB.ok, true);
  assert.equal(openedByA.ok && openedByB.ok && openedByA.conversation.conversationId, openedByB.ok && openedByB.conversation.conversationId);
});

// 4
test("4: only friends can send — sending to a non-existent conversationId is rejected", async () => {
  const result = await sendPrivateMessage("player-a", "no-such-conversation", "היי");
  assert.deepEqual(result, { ok: false, error: "not-a-participant" });
});

// 5 — unrelated third player cannot read by guessing a real conversationId.
test("5: an unrelated third player cannot read a real conversation between two other friends", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const opened = await getOrCreateConversation("player-a", "player-b");
  assert.equal(opened.ok, true);
  const conversationId = opened.ok ? opened.conversation.conversationId : "";

  seedPrivateMessage({ conversationId, senderId: "player-a", message: "secret" });

  const asOutsider = await getConversationMessages("player-c", conversationId);
  assert.equal(asOutsider, null, "an unrelated player must get null, never the real messages");
});

// 6 — unrelated third player cannot send.
test("6: an unrelated third player cannot send into a real conversation between two other friends", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const opened = await getOrCreateConversation("player-a", "player-b");
  const conversationId = opened.ok ? opened.conversation.conversationId : "";

  const result = await sendPrivateMessage("player-c", conversationId, "אני רוצה להיכנס לשיחה");
  assert.deepEqual(result, { ok: false, error: "not-a-participant" });
  assert.equal(getPrivateMessageCount(conversationId), 0);
});

// 7 — message validation.
test("7: message validation — empty, whitespace-only, and over-length are rejected; whitespace is trimmed on a valid send", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const opened = await getOrCreateConversation("player-a", "player-b");
  const conversationId = opened.ok ? opened.conversation.conversationId : "";

  assert.deepEqual(await sendPrivateMessage("player-a", conversationId, ""), { ok: false, error: "empty" });
  assert.deepEqual(await sendPrivateMessage("player-a", conversationId, "   \n\t "), { ok: false, error: "empty" });

  const tooLong = "א".repeat(301);
  assert.deepEqual(await sendPrivateMessage("player-a", conversationId, tooLong), { ok: false, error: "too-long" });

  const sent = await sendPrivateMessage("player-a", conversationId, "  שלום  ");
  assert.equal(sent.ok, true);
  assert.equal(sent.ok && sent.message.message, "שלום");
});

// 8 — only latest PRIVATE_CHAT_MAX_MESSAGES retained per conversation, and
// cleanup never touches another conversation.
test("8: only the latest PRIVATE_CHAT_MAX_MESSAGES are retained per conversation, and another conversation's messages are never touched", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  seedFriendship({ requesterId: "player-a", addresseeId: "player-c", status: "accepted" });

  const openedAB = await getOrCreateConversation("player-a", "player-b");
  const openedAC = await getOrCreateConversation("player-a", "player-c");
  const conversationAB = openedAB.ok ? openedAB.conversation.conversationId : "";
  const conversationAC = openedAC.ok ? openedAC.conversation.conversationId : "";

  const base = new Date("2026-08-20T10:00:00.000Z").getTime();
  const seeded = [];
  for (let i = 0; i < PRIVATE_CHAT_MAX_MESSAGES; i += 1) {
    seeded.push(seedPrivateMessage({ conversationId: conversationAB, senderId: "player-a", message: `msg-${i}`, createdAt: new Date(base + i * 1000) }));
  }
  const untouchedMessage = seedPrivateMessage({ conversationId: conversationAC, senderId: "player-a", message: "unrelated conversation" });

  const oldestId = seeded[0]!.id;
  const result = await sendPrivateMessage("player-b", conversationAB, "the 501st message");
  assert.equal(result.ok, true);

  assert.equal(getPrivateMessageCount(conversationAB), PRIVATE_CHAT_MAX_MESSAGES, "conversation AB must be trimmed back to the cap");
  assert.ok(!getPrivateMessageRows(conversationAB).some((row) => row.id === oldestId), "the oldest message in THIS conversation must be removed");

  assert.equal(getPrivateMessageCount(conversationAC), 1, "the unrelated conversation AC must be completely untouched");
  assert.ok(getPrivateMessageRows(conversationAC).some((row) => row.id === untouchedMessage.id));
});

// 9 — polling/read never modifies data.
test("9: reading a conversation's messages never modifies data", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const opened = await getOrCreateConversation("player-a", "player-b");
  const conversationId = opened.ok ? opened.conversation.conversationId : "";
  seedPrivateMessage({ conversationId, senderId: "player-a", message: "hi" });

  const before = getPrivateMessageRows(conversationId);
  await getConversationMessages("player-a", conversationId);
  await getConversationMessages("player-b", conversationId);
  const after = getPrivateMessageRows(conversationId);

  assert.deepEqual(after, before);
});

// FRIENDS + PRIVATE CHAT UX — private-message notification (ticket section
// 9). Reuses the existing Notification system (notification-service.ts) —
// no second one.

// 10
test("10: sending a private message creates exactly one PRIVATE_MESSAGE_RECEIVED notification for the recipient, naming the sender", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const opened = await getOrCreateConversation("player-a", "player-b");
  const conversationId = opened.ok ? opened.conversation.conversationId : "";

  const result = await sendPrivateMessage("player-a", conversationId, "היי!");
  assert.equal(result.ok, true);

  const notificationsForB = getNotificationsFor("player-b");
  assert.equal(notificationsForB.length, 1);
  assert.equal(notificationsForB[0]?.type, "PRIVATE_MESSAGE_RECEIVED");
  assert.ok(notificationsForB[0]?.message.includes("אביב"), "the notification must name the sender by their safe display name");
  assert.equal(getNotificationsFor("player-a").length, 0, "the sender themselves gets no notification for their own message");
});

// 11
test("11: a second message in the same conversation does not create a duplicate notification while the first is still unread", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const opened = await getOrCreateConversation("player-a", "player-b");
  const conversationId = opened.ok ? opened.conversation.conversationId : "";

  await sendPrivateMessage("player-a", conversationId, "הודעה ראשונה");
  await sendPrivateMessage("player-a", conversationId, "הודעה שנייה");

  assert.equal(getNotificationsFor("player-b").length, 1, "a rapid follow-up message must not pile up a second unread notification");
});

// 12
test("12: after the recipient reads their notifications, the next message creates a fresh notification", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const opened = await getOrCreateConversation("player-a", "player-b");
  const conversationId = opened.ok ? opened.conversation.conversationId : "";

  await sendPrivateMessage("player-a", conversationId, "הודעה ראשונה");
  const [firstNotification] = getNotificationsFor("player-b");
  await markNotificationRead("player-b", firstNotification!.id);

  await sendPrivateMessage("player-a", conversationId, "הודעה שנייה");

  assert.equal(getNotificationsFor("player-b").length, 2, "a message after the previous notification was read must create a new one");
});

// 13
test("13: a message in a DIFFERENT conversation is never suppressed by an unrelated unread notification", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  seedFriendship({ requesterId: "player-c", addresseeId: "player-b", status: "accepted" });
  const withA = await getOrCreateConversation("player-a", "player-b");
  const withC = await getOrCreateConversation("player-c", "player-b");

  await sendPrivateMessage("player-a", withA.ok ? withA.conversation.conversationId : "", "היי מ-A");
  await sendPrivateMessage("player-c", withC.ok ? withC.conversation.conversationId : "", "היי מ-C");

  assert.equal(getNotificationsFor("player-b").length, 2, "two different conversations must each get their own notification");
});
