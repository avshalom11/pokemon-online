// STAFF / MODERATION — PHASE 4 — CHAT BAN ENFORCEMENT. Exercises the new
// active-chat-ban check inside sendGlobalChatMessage (features/chat/
// services/global-chat.service.ts) against the fake DB — never against
// the live DEV database. Reading Global Chat and private messaging are
// asserted here specifically because the brief calls out both as things
// this change must NOT affect.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getRecentGlobalChatMessages, sendGlobalChatMessage } from "@/features/chat/services/global-chat.service";
import { getOrCreateConversation, sendPrivateMessage } from "@/features/friends/services/private-chat.service";
import {
  getGlobalChatMessageCount,
  resetFakeDb,
  seedFriendship,
  seedModerationAction,
  seedPlayerProfile,
} from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "player-1", displayName: "אביב" });
  seedPlayerProfile({ id: "player-2", displayName: "נועה" });
});

// 1 — active chat ban blocks sending
test("1: a player with an active chat ban cannot send a Global Chat message", async () => {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  seedModerationAction({ targetPlayerId: "player-1", actorPlayerId: "staff-1", actionType: "chat_ban", expiresAt });

  const result = await sendGlobalChatMessage("player-1", "היי לכולם");
  assert.deepEqual(result, { ok: false, error: "chat-banned", expiresAt: expiresAt.toISOString() });
  assert.equal(getGlobalChatMessageCount(), 0, "no message must ever be created for a chat-banned sender");
});

// 2 — expired chat ban does not block
test("2: an expired chat ban does not block sending", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: new Date(Date.now() - 60_000),
  });

  const result = await sendGlobalChatMessage("player-1", "היי לכולם");
  assert.equal(result.ok, true);
  assert.equal(getGlobalChatMessageCount(), 1);
});

// 3 — revoked chat ban does not block
test("3: a revoked (but not yet expired) chat ban does not block sending", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: new Date(),
    revokedByPlayerId: "owner-1",
  });

  const result = await sendGlobalChatMessage("player-1", "היי לכולם");
  assert.equal(result.ok, true);
});

// 4 — a site ban alone (no chat ban) never blocks Global Chat sending
test("4: an active SITE ban (no chat ban) does not block Global Chat sending", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "site_ban",
    expiresAt: new Date(Date.now() + 60_000),
  });
  const result = await sendGlobalChatMessage("player-1", "היי לכולם");
  assert.equal(result.ok, true);
});

// 5 — reading Global Chat is never affected by a chat ban
test("5: a chat-banned player can still read Global Chat", async () => {
  seedPlayerProfile({ id: "player-3" });
  const okSend = await sendGlobalChatMessage("player-3", "לפני האיסור");
  assert.equal(okSend.ok, true);

  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: new Date(Date.now() + 60_000),
  });

  const messages = await getRecentGlobalChatMessages();
  assert.equal(messages.length, 1, "reading must be completely unaffected by another player's — or even this reader's own — chat ban");
});

// 6 — private messages remain fully usable during a Global Chat ban
test("6: a chat-banned player can still send and receive private messages with a friend", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: new Date(Date.now() + 60_000),
  });
  seedFriendship({ requesterId: "player-1", addresseeId: "player-2", status: "accepted" });

  const opened = await getOrCreateConversation("player-1", "player-2");
  assert.ok(opened.ok);
  if (!opened.ok) return;

  const sent = await sendPrivateMessage("player-1", opened.conversation.conversationId, "פרטי בלבד");
  assert.equal(sent.ok, true, "a chat ban must never block private messaging");
});
