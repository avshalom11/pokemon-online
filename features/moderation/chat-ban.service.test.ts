// STAFF / MODERATION — PHASE 3 — the authoritative chat-ban orchestration
// service (issueChatBan), exercised end to end against the fake DB: role
// resolution, permission/hierarchy checks, reason validation, and the
// underlying transactional record — never against the live DEV database,
// and never wired into any runtime/UI path.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { issueChatBan } from "@/features/moderation/services/chat-ban.service";
import { revokeBan } from "@/features/moderation/services/revoke-ban.service";
import { getPlayerModerationCountersRow, resetFakeDb, seedPlayerProfile, seedStaffMember } from "../../test/support/fakes/prisma.fake.ts";

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

// 1 — first progressive chat ban (SUPPORT)
test("1: SUPPORT's first chat ban against a plain player is progressive — 15 minutes, no duration accepted", async () => {
  const result = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "spam" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.durationMinutes, 15);
  assert.equal(result.occurrence, 1);
  assert.equal(result.action.reason, "spam");
});

// 2 — next progressive chat ban (DEPUTY), after revoking the first
test("2: the target's 2nd chat ban (issued by DEPUTY, after the 1st is revoked) is 1 hour", async () => {
  const first = await issueChatBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "spam" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const revoke = await revokeBan({ actorPlayerId: "owner-1", actionId: first.action.id, reason: "appeal accepted" });
  assert.equal(revoke.ok, true);

  const second = await issueChatBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "spam again" });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.occurrence, 2);
  assert.equal(second.durationMinutes, 60);
});

// 3 — OWNER manual duration
test("3: OWNER may manually choose an allowed chat-ban duration, bypassing progression", async () => {
  const result = await issueChatBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "toxicity", durationMinutes: 7 * 24 * 60 });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.durationMinutes, 7 * 24 * 60);
});

// 4 — OWNER must supply a duration
test("4: OWNER issuing a chat ban without a duration is rejected", async () => {
  const result = await issueChatBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "toxicity" });
  assert.deepEqual(result, { ok: false, error: "owner-duration-required" });
});

// 5 — OWNER's duration must be one of the six canonical values
test("5: OWNER's off-table duration is rejected", async () => {
  const result = await issueChatBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "toxicity", durationMinutes: 45 });
  assert.deepEqual(result, { ok: false, error: "invalid-owner-duration" });
});

// 6 — DEPUTY/SUPPORT cannot choose a duration
test("6: DEPUTY/SUPPORT supplying a duration is rejected — they cannot choose another duration", async () => {
  const deputyResult = await issueChatBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "spam", durationMinutes: 60 });
  assert.deepEqual(deputyResult, { ok: false, error: "duration-not-allowed-for-role" });

  const supportResult = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-2", reason: "spam", durationMinutes: 60 });
  assert.deepEqual(supportResult, { ok: false, error: "duration-not-allowed-for-role" });
});

// 7 — duplicate active ban rejection through the real orchestration
test("7: a 2nd chat ban attempt while one is already active is rejected", async () => {
  const first = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "spam" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = await issueChatBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "still spamming" });
  assert.deepEqual(second, { ok: false, error: "already-banned", existingActionId: first.action.id });
});

// 8 — reason validation: empty
test("8: an empty (or whitespace-only) reason is rejected", async () => {
  const empty = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "" });
  assert.deepEqual(empty, { ok: false, error: "invalid-reason" });

  const whitespace = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "   \n\t  " });
  assert.deepEqual(whitespace, { ok: false, error: "invalid-reason" });
});

// 9 — reason validation: over the max length
test("9: a reason over the maximum length is rejected", async () => {
  const tooLong = "x".repeat(501);
  const result = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: tooLong });
  assert.deepEqual(result, { ok: false, error: "invalid-reason" });
});

// 10 — reason validation: trimmed
test("10: a reason with surrounding whitespace is trimmed before storage", async () => {
  const result = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "  spam  " });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.action.reason, "spam");
});

// 11 — hierarchy: SUPPORT cannot target DEPUTY
test("11: SUPPORT cannot chat-ban a DEPUTY", async () => {
  const result = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "deputy-1", reason: "abuse of power" });
  assert.deepEqual(result, { ok: false, error: "hierarchy-violation" });
});

// 12 — hierarchy: DEPUTY cannot target OWNER
test("12: DEPUTY cannot chat-ban OWNER", async () => {
  const result = await issueChatBan({ actorPlayerId: "deputy-1", targetPlayerId: "owner-1", reason: "??" });
  assert.deepEqual(result, { ok: false, error: "hierarchy-violation" });
});

// 13 — a plain player cannot issue a chat ban at all
test("13: a plain player (no StaffMember row) cannot issue a chat ban", async () => {
  const result = await issueChatBan({ actorPlayerId: "player-2", targetPlayerId: "player-1", reason: "??" });
  assert.deepEqual(result, { ok: false, error: "actor-not-staff" });
});

// 14 — OWNER can chat-ban DEPUTY/SUPPORT
test("14: OWNER may chat-ban DEPUTY and SUPPORT", async () => {
  const deputyResult = await issueChatBan({ actorPlayerId: "owner-1", targetPlayerId: "deputy-1", reason: "misconduct", durationMinutes: 60 });
  assert.equal(deputyResult.ok, true);
});

// 15 — CONCURRENCY: two staff racing the FIRST chat ban against the same player, through the real service
test("15: concurrent chat-ban attempts against the same target through issueChatBan — exactly one succeeds", async () => {
  const [resultA, resultB] = await Promise.all([
    issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "spam A" }),
    issueChatBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "spam B" }),
  ]);
  const successes = [resultA, resultB].filter((result) => result.ok);
  const rejections = [resultA, resultB].filter((result) => !result.ok);
  assert.equal(successes.length, 1);
  assert.equal(rejections.length, 1);
  const winner = successes[0];
  assert.ok(winner?.ok);
  if (!winner?.ok) return;
  assert.deepEqual(rejections[0], { ok: false, error: "already-banned", existingActionId: winner.action.id });
  assert.equal(getPlayerModerationCountersRow("player-1")?.chatBanCount, 1);
});

// 16 — revocation preserves progression through the real revoke service
test("16: revoking a chat ban through revokeBan does not reset the target's next progressive duration", async () => {
  const first = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "spam" });
  assert.equal(first.ok, true);
  if (!first.ok) return;

  const revoke = await revokeBan({ actorPlayerId: "owner-1", actionId: first.action.id, reason: "appeal accepted" });
  assert.equal(revoke.ok, true);

  const second = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "spam again" });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.occurrence, 2, "must still be the 2nd ban, not reset to 1st by the revocation");
  assert.equal(second.durationMinutes, 60);
});
