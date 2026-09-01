// STAFF / MODERATION — PHASE 5 — the authoritative Global Chat message
// deletion service, exercised against the fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { deleteGlobalChatMessage } from "@/features/moderation/services/delete-message.service";
import {
  getGlobalChatMessageCount,
  getGlobalChatMessageRows,
  getModerationActionRowsForPlayer,
  resetFakeDb,
  seedGlobalChatMessage,
  seedPlayerProfile,
  seedStaffMember,
} from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerProfile({ id: "deputy-1" });
  seedPlayerProfile({ id: "support-1" });
  seedPlayerProfile({ id: "player-1" });
  seedStaffMember({ playerId: "owner-1", role: "OWNER" });
  seedStaffMember({ playerId: "deputy-1", role: "DEPUTY" });
  seedStaffMember({ playerId: "support-1", role: "SUPPORT" });
});

// 1 — authorized deletion + audit row
test("1: OWNER/DEPUTY/SUPPORT can hard-delete another player's message, creating an audit ModerationAction row", async () => {
  const message = seedGlobalChatMessage({ playerId: "player-1", message: "spam" });
  const result = await deleteGlobalChatMessage({ actorPlayerId: "support-1", messageId: message.id, reason: "spam" });
  assert.deepEqual(result, { ok: true, deletedMessageId: message.id });

  assert.equal(getGlobalChatMessageCount(), 0, "the message must be HARD deleted, not merely hidden");
  assert.ok(!getGlobalChatMessageRows().some((row) => row.id === message.id));

  const audit = getModerationActionRowsForPlayer("player-1");
  assert.equal(audit.length, 1);
  assert.equal(audit[0]?.actionType, "message_delete");
  assert.equal(audit[0]?.targetResourceId, message.id, "the audit row's targetResourceId must be the deleted message's own id");
  assert.equal(audit[0]?.actorPlayerId, "support-1");
  assert.equal(audit[0]?.reason, "spam");
});

// 2 — hierarchy-protected deletion rejected (SUPPORT cannot moderate DEPUTY)
test("2: SUPPORT cannot delete a DEPUTY's message — hierarchy is enforced the same way as every other moderation action", async () => {
  const message = seedGlobalChatMessage({ playerId: "deputy-1", message: "hi" });
  const result = await deleteGlobalChatMessage({ actorPlayerId: "support-1", messageId: message.id, reason: "??" });
  assert.deepEqual(result, { ok: false, error: "hierarchy-violation" });
  assert.equal(getGlobalChatMessageCount(), 1, "the message must be untouched by the rejected attempt");
});

// 3 — DEPUTY cannot target OWNER either
test("3: DEPUTY cannot delete OWNER's message", async () => {
  const message = seedGlobalChatMessage({ playerId: "owner-1", message: "hi" });
  const result = await deleteGlobalChatMessage({ actorPlayerId: "deputy-1", messageId: message.id, reason: "??" });
  assert.deepEqual(result, { ok: false, error: "hierarchy-violation" });
});

// 4 — OWNER's message cannot be moderated by anyone, including another attempted OWNER-role actor
test("4: OWNER's message can never be moderated, not even by OWNER itself", async () => {
  seedPlayerProfile({ id: "owner-2" });
  seedStaffMember({ playerId: "owner-2", role: "SUPPORT" }); // irrelevant; real system only ever has 1 OWNER, this just proves rank alone decides
  const message = seedGlobalChatMessage({ playerId: "owner-1", message: "hi" });

  const result = await deleteGlobalChatMessage({ actorPlayerId: "owner-2", messageId: message.id, reason: "??" });
  assert.deepEqual(result, { ok: false, error: "hierarchy-violation" });
  assert.equal(getGlobalChatMessageCount(), 1);
});

// 5 — a plain player cannot delete anything
test("5: a plain player (not staff) cannot delete a message", async () => {
  const message = seedGlobalChatMessage({ playerId: "player-1", message: "hi" });
  const result = await deleteGlobalChatMessage({ actorPlayerId: "player-1", messageId: message.id, reason: "??" });
  assert.deepEqual(result, { ok: false, error: "actor-not-staff" });
});

// 6 — reason required
test("6: an empty reason is rejected before anything else runs — the message survives", async () => {
  const message = seedGlobalChatMessage({ playerId: "player-1", message: "hi" });
  const result = await deleteGlobalChatMessage({ actorPlayerId: "owner-1", messageId: message.id, reason: "   " });
  assert.deepEqual(result, { ok: false, error: "invalid-reason" });
  assert.equal(getGlobalChatMessageCount(), 1);
});

// 7 — message not found
test("7: deleting a non-existent message id is rejected cleanly", async () => {
  const result = await deleteGlobalChatMessage({ actorPlayerId: "owner-1", messageId: "does-not-exist", reason: "n/a" });
  assert.deepEqual(result, { ok: false, error: "message-not-found" });
});
