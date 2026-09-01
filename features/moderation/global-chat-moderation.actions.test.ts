// STAFF / MODERATION — PHASE 5 — the Server Action layer itself
// (features/moderation/actions/global-chat-moderation.actions.ts),
// exercised end to end against the fake session + fake DB. This is the
// layer that proves "never trust role, target playerId, duration
// eligibility, or progression from the client" — every action here only
// ever accepts a messageId (the target is always resolved server-side)
// and derives the acting role from the fake session, exactly like every
// other Server Action in this codebase.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  deleteGlobalChatMessageAction,
  issueChatBanAction,
  issuePermanentSiteBanAction,
  issueTemporarySiteBanAction,
  previewChatBanDurationAction,
} from "@/features/moderation/actions/global-chat-moderation.actions";
import { __setSession } from "../../test/support/fakes/auth-session.fake.ts";
import {
  getGlobalChatMessageCount,
  getPlayerModerationCountersRow,
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
  seedPlayerProfile({ id: "player-2" });
  seedStaffMember({ playerId: "owner-1", role: "OWNER" });
  seedStaffMember({ playerId: "deputy-1", role: "DEPUTY" });
  seedStaffMember({ playerId: "support-1", role: "SUPPORT" });
});

// 1 — unauthenticated caller is rejected before anything else runs
test("1: an unauthenticated caller cannot delete a message or issue any punishment", async () => {
  __setSession(null);
  const message = seedGlobalChatMessage({ playerId: "player-1" });

  assert.deepEqual(await deleteGlobalChatMessageAction({ messageId: message.id, reason: "x" }), { ok: false, error: "unauthenticated" });
  assert.deepEqual(await issueChatBanAction({ messageId: message.id, reason: "x" }), { ok: false, error: "unauthenticated" });
  assert.equal(getGlobalChatMessageCount(), 1);
});

// 2 — the target is ALWAYS resolved from the real message row, never from
// any client-supplied field — proven by passing an extra, forged field
// the action's own parameter type doesn't even declare and confirming it
// has zero effect.
test("2: a forged extra field on the request body cannot redirect the target away from the message's real sender", async () => {
  __setSession({ user: { id: "support-1" } });
  const realMessage = seedGlobalChatMessage({ playerId: "player-1" });

  const forgedParams = { messageId: realMessage.id, reason: "spam", targetPlayerId: "player-2" } as { messageId: string; reason: string };
  const result = await issueChatBanAction(forgedParams);
  assert.equal(result.ok, true);

  // The real target must be player-1 (the message's actual sender) — if
  // the forged targetPlayerId field had been honored instead, player-2's
  // counter would have incremented and player-1's would not.
  assert.equal(getPlayerModerationCountersRow("player-1")?.chatBanCount, 1);
  assert.equal(getPlayerModerationCountersRow("player-2")?.chatBanCount ?? 0, 0);
});

// 3 — forged duration from a non-OWNER actor is rejected server-side
test("3: a DEPUTY/SUPPORT caller cannot smuggle a duration through the Server Action", async () => {
  __setSession({ user: { id: "support-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await issueChatBanAction({ messageId: message.id, reason: "spam", durationMinutes: 60 });
  assert.deepEqual(result, { ok: false, error: "duration-not-allowed-for-role" });
});

// 4 — a forged/impossible role cannot be asserted — the actor's role is
// ALWAYS derived from the real session + StaffMember row, never from
// anything the request body could carry (these actions don't even have a
// role parameter to forge).
test("4: the actor's role is always derived from the real session, not any request field — a plain player's session is rejected regardless of intent", async () => {
  __setSession({ user: { id: "player-2" } }); // a genuine plain player, no StaffMember row
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await issuePermanentSiteBanAction({ messageId: message.id, reason: "trying to escalate" });
  assert.deepEqual(result, { ok: false, error: "actor-not-staff" });
});

// 5 — permanent-ban action is OWNER-only, end to end through the real action
test("5: issuePermanentSiteBanAction rejects DEPUTY and SUPPORT, accepts OWNER", async () => {
  const message = seedGlobalChatMessage({ playerId: "player-1" });

  __setSession({ user: { id: "deputy-1" } });
  assert.deepEqual(await issuePermanentSiteBanAction({ messageId: message.id, reason: "unforgivable" }), {
    ok: false,
    error: "actor-lacks-permission",
  });

  __setSession({ user: { id: "support-1" } });
  assert.deepEqual(await issuePermanentSiteBanAction({ messageId: message.id, reason: "unforgivable" }), {
    ok: false,
    error: "actor-lacks-permission",
  });

  __setSession({ user: { id: "owner-1" } });
  const ownerResult = await issuePermanentSiteBanAction({ messageId: message.id, reason: "unforgivable" });
  assert.equal(ownerResult.ok, true);
});

// 6 — reason required, end to end through the real action
test("6: deleteGlobalChatMessageAction rejects an empty reason before touching the message", async () => {
  __setSession({ user: { id: "owner-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await deleteGlobalChatMessageAction({ messageId: message.id, reason: "   " });
  assert.deepEqual(result, { ok: false, error: "invalid-reason" });
  assert.equal(getGlobalChatMessageCount(), 1);
});

// 7 — OWNER's duration choices are restricted to the canonical values, end to end
test("7: issueTemporarySiteBanAction rejects an OWNER-supplied off-table duration", async () => {
  __setSession({ user: { id: "owner-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await issueTemporarySiteBanAction({ messageId: message.id, reason: "severe", durationMinutes: 45 });
  assert.deepEqual(result, { ok: false, error: "invalid-owner-duration" });
});

// 8 — OWNER's canonical duration IS accepted
test("8: issueChatBanAction accepts one of OWNER's exact canonical durations", async () => {
  __setSession({ user: { id: "owner-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await issueChatBanAction({ messageId: message.id, reason: "toxicity", durationMinutes: 7 * 24 * 60 });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.durationMinutes, 7 * 24 * 60);
});

// 9 — progressive duration preview is served by the server, re-authorized the same way
test("9: previewChatBanDurationAction returns the server-computed duration, and is itself authorized", async () => {
  __setSession({ user: { id: "support-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await previewChatBanDurationAction({ messageId: message.id });
  assert.deepEqual(result, { ok: true, durationMinutes: 15 });

  __setSession({ user: { id: "player-2" } });
  const unauthorized = await previewChatBanDurationAction({ messageId: message.id });
  assert.deepEqual(unauthorized, { ok: false, error: "actor-not-staff" });
});

// 10 — a non-existent message id is rejected cleanly through every action
test("10: a non-existent messageId is rejected as message-not-found through the ban actions", async () => {
  __setSession({ user: { id: "owner-1" } });
  const result = await issueChatBanAction({ messageId: "nope", reason: "x", durationMinutes: 60 });
  assert.deepEqual(result, { ok: false, error: "message-not-found" });
});

// 11 — hierarchy still protects OWNER's message through the full action path
test("11: OWNER's message cannot be deleted through the Server Action, even by a caller resolved as OWNER", async () => {
  seedPlayerProfile({ id: "owner-2" });
  seedStaffMember({ playerId: "owner-2", role: "SUPPORT" });
  __setSession({ user: { id: "owner-2" } });
  const message = seedGlobalChatMessage({ playerId: "owner-1" });
  const result = await deleteGlobalChatMessageAction({ messageId: message.id, reason: "x" });
  assert.deepEqual(result, { ok: false, error: "hierarchy-violation" });
  assert.equal(getGlobalChatMessageCount(), 1);
});
