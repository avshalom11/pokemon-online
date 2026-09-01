// STAFF / MODERATION — PHASE 7 — FINAL END-TO-END INTEGRATION + SECURITY
// REVIEW. Deliberately does NOT re-verify individual unit-level behavior
// already covered by Phase 1-6's own test files (progression tables,
// permission-matrix truth tables, etc.) — this file walks each role
// through its COMPLETE real allowed action set via the actual Server
// Action layer (never the lower-level services directly), verifies
// hierarchy cannot be bypassed through direct Server Action calls with
// forged parameters, and checks the two cross-cutting integrity
// properties Phase 7 calls out that no earlier phase explicitly proved:
// username-independence of staff authority, and action-layer
// concurrency safety. Every test here runs against the isolated fake DB
// — never the real DEV database.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  deleteGlobalChatMessageAction,
  issueChatBanAction,
  issuePermanentSiteBanAction,
  issueTemporarySiteBanAction,
  revokeBanAction,
} from "@/features/moderation/actions/global-chat-moderation.actions";
import { appointStaffMemberAction, getStaffRosterViewAction, removeStaffMemberAction } from "@/features/moderation/actions/manage-staff.actions";
import { getModerationHistoryAction } from "@/features/moderation/actions/moderation-history.actions";
import { getStaffRole } from "@/features/moderation/services/staff-role.service";
import { __setSession } from "../../test/support/fakes/auth-session.fake.ts";
import {
  getGlobalChatMessageCount,
  getPlayerModerationCountersRow,
  resetFakeDb,
  seedGlobalChatMessage,
  seedPlayerProfile,
  seedStaffMember,
  seedUser,
} from "../../test/support/fakes/prisma.fake.ts";

function seedStaff(playerId: string, role: "OWNER" | "DEPUTY" | "SUPPORT") {
  seedPlayerProfile({ id: playerId });
  seedStaffMember({ playerId, role });
}

beforeEach(() => {
  resetFakeDb();
  seedStaff("owner-1", "OWNER");
  seedStaff("deputy-1", "DEPUTY");
  seedStaff("support-1", "SUPPORT");
  seedPlayerProfile({ id: "player-1" });
  seedPlayerProfile({ id: "player-2" });
});

// ==================================================
// A — OWNER: full Global Chat moderation + staff management
// ==================================================

test("A1: OWNER — manual chat ban with a canonical duration", async () => {
  __setSession({ user: { id: "owner-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await issueChatBanAction({ messageId: message.id, reason: "toxicity", durationMinutes: 12 * 60 });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.durationMinutes, 12 * 60);
});

test("A2: OWNER — manual temporary site ban with a canonical duration", async () => {
  __setSession({ user: { id: "owner-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await issueTemporarySiteBanAction({ messageId: message.id, reason: "severe", durationMinutes: 6 * 60 });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.durationMinutes, 6 * 60);
});

test("A3: OWNER — permanent site ban, then revoke it", async () => {
  __setSession({ user: { id: "owner-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const banned = await issuePermanentSiteBanAction({ messageId: message.id, reason: "unforgivable" });
  assert.equal(banned.ok, true);
  if (!banned.ok) return;

  const revoked = await revokeBanAction({ actionId: banned.action.id, reason: "appeal accepted" });
  assert.equal(revoked.ok, true);
});

test("A4: OWNER — delete a message", async () => {
  __setSession({ user: { id: "owner-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await deleteGlobalChatMessageAction({ messageId: message.id, reason: "spam" });
  assert.deepEqual(result, { ok: true, deletedMessageId: message.id });
  assert.equal(getGlobalChatMessageCount(), 0);
});

test("A5: OWNER — appoint DEPUTY and SUPPORT, then remove them", async () => {
  // This scenario needs an EMPTY DEPUTY/SUPPORT roster to appoint into —
  // the shared beforeEach above pre-seeds deputy-1/support-1 for every
  // other test in this file, so start this one from a clean slate with
  // only OWNER present.
  resetFakeDb();
  seedStaff("owner-1", "OWNER");
  seedPlayerProfile({ id: "player-1" });
  seedPlayerProfile({ id: "player-2" });

  __setSession({ user: { id: "owner-1" } });
  seedUser({ id: "player-1", username: "future-deputy" });
  seedUser({ id: "player-2", username: "future-support" });

  const appointDeputy = await appointStaffMemberAction({ targetUsername: "future-deputy", role: "DEPUTY" });
  assert.equal(appointDeputy.ok, true);
  const appointSupport = await appointStaffMemberAction({ targetUsername: "future-support", role: "SUPPORT" });
  assert.equal(appointSupport.ok, true);

  const roster = await getStaffRosterViewAction();
  assert.equal(roster.ok, true);
  if (roster.ok) {
    assert.equal(roster.roster.deputy?.playerId, "player-1");
    assert.equal(roster.roster.support.length, 1);
  }

  const removeDeputy = await removeStaffMemberAction({ targetUsername: "future-deputy" });
  assert.deepEqual(removeDeputy, { ok: true });
  assert.equal(await getStaffRole("player-1"), null);
});

test("A6: OWNER — can view full moderation history", async () => {
  __setSession({ user: { id: "owner-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  await deleteGlobalChatMessageAction({ messageId: message.id, reason: "spam" });

  const history = await getModerationHistoryAction();
  assert.equal(history.ok, true);
  if (history.ok) assert.equal(history.history.length, 1);
});

// ==================================================
// B — DEPUTY: allowed actions, and explicit denials
// ==================================================

test("B1: DEPUTY — can delete an allowed player's message", async () => {
  __setSession({ user: { id: "deputy-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await deleteGlobalChatMessageAction({ messageId: message.id, reason: "spam" });
  assert.equal(result.ok, true);
});

test("B2: DEPUTY — progressive chat ban (no duration choice)", async () => {
  __setSession({ user: { id: "deputy-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await issueChatBanAction({ messageId: message.id, reason: "spam" });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.durationMinutes, 15);
});

test("B3: DEPUTY — progressive temporary site ban (no duration choice)", async () => {
  __setSession({ user: { id: "deputy-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await issueTemporarySiteBanAction({ messageId: message.id, reason: "cheating" });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.durationMinutes, 30);
});

test("B4: DEPUTY — cannot issue a permanent ban", async () => {
  __setSession({ user: { id: "deputy-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await issuePermanentSiteBanAction({ messageId: message.id, reason: "unforgivable" });
  assert.deepEqual(result, { ok: false, error: "actor-lacks-permission" });
});

test("B5: DEPUTY — cannot manage staff (appoint or remove)", async () => {
  __setSession({ user: { id: "deputy-1" } });
  seedUser({ id: "player-1", username: "target1" });
  const appointResult = await appointStaffMemberAction({ targetUsername: "target1", role: "SUPPORT" });
  assert.deepEqual(appointResult, { ok: false, error: "not-owner" });

  const removeResult = await removeStaffMemberAction({ targetUsername: "target1" });
  assert.deepEqual(removeResult, { ok: false, error: "not-owner" });
});

test("B6: DEPUTY — cannot view moderation history (OWNER-only for now)", async () => {
  __setSession({ user: { id: "deputy-1" } });
  const result = await getModerationHistoryAction();
  assert.deepEqual(result, { ok: false, error: "not-owner" });
});

// ==================================================
// C — SUPPORT: allowed actions, and explicit denials
// ==================================================

test("C1: SUPPORT — can delete an allowed player's message", async () => {
  __setSession({ user: { id: "support-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await deleteGlobalChatMessageAction({ messageId: message.id, reason: "spam" });
  assert.equal(result.ok, true);
});

test("C2: SUPPORT — progressive chat ban (no duration choice)", async () => {
  __setSession({ user: { id: "support-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await issueChatBanAction({ messageId: message.id, reason: "spam" });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.durationMinutes, 15);
});

test("C3: SUPPORT — cannot issue any site ban, temporary or permanent", async () => {
  __setSession({ user: { id: "support-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });

  const temp = await issueTemporarySiteBanAction({ messageId: message.id, reason: "cheating" });
  assert.deepEqual(temp, { ok: false, error: "actor-lacks-permission" });

  const permanent = await issuePermanentSiteBanAction({ messageId: message.id, reason: "unforgivable" });
  assert.deepEqual(permanent, { ok: false, error: "actor-lacks-permission" });
});

test("C4: SUPPORT — cannot manage staff", async () => {
  __setSession({ user: { id: "support-1" } });
  seedUser({ id: "player-1", username: "target1" });
  const result = await appointStaffMemberAction({ targetUsername: "target1", role: "SUPPORT" });
  assert.deepEqual(result, { ok: false, error: "not-owner" });
});

// ==================================================
// D — HIERARCHY CANNOT BE BYPASSED THROUGH DIRECT SERVER ACTION CALLS
// ==================================================

test("D1: SUPPORT cannot moderate a DEPUTY's message through the real action", async () => {
  __setSession({ user: { id: "support-1" } });
  const message = seedGlobalChatMessage({ playerId: "deputy-1" });
  const result = await deleteGlobalChatMessageAction({ messageId: message.id, reason: "??" });
  assert.deepEqual(result, { ok: false, error: "hierarchy-violation" });
});

test("D2: DEPUTY cannot moderate OWNER through the real action, even a chat ban", async () => {
  __setSession({ user: { id: "deputy-1" } });
  const message = seedGlobalChatMessage({ playerId: "owner-1" });
  const result = await issueChatBanAction({ messageId: message.id, reason: "??" });
  assert.deepEqual(result, { ok: false, error: "hierarchy-violation" });
});

test("D3: a forged 'role' string cannot escalate a DEPUTY/SUPPORT chat ban into an OWNER-style manual duration", async () => {
  __setSession({ user: { id: "support-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  // A tampered client cannot pass a `role` field at all — issueChatBanAction
  // has no such parameter; the actor's role is always re-derived from the
  // real session server-side. Confirmed here by proving that supplying a
  // duration (the one thing OWNER-only status would unlock) is still
  // rejected outright for this SUPPORT session.
  const result = await issueChatBanAction({ messageId: message.id, reason: "spam", durationMinutes: 60 });
  assert.deepEqual(result, { ok: false, error: "duration-not-allowed-for-role" });
});

test("D4: appointStaffMemberAction rejects a forged OWNER role even when the actor genuinely is OWNER", async () => {
  __setSession({ user: { id: "owner-1" } });
  seedUser({ id: "player-1", username: "target1" });
  const result = await appointStaffMemberAction({ targetUsername: "target1", role: "OWNER" });
  assert.deepEqual(result, { ok: false, error: "invalid-role" });
});

test("D5: a non-staff plain player cannot reach any moderation action, regardless of which one is attempted", async () => {
  __setSession({ user: { id: "player-2" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });

  assert.deepEqual(await deleteGlobalChatMessageAction({ messageId: message.id, reason: "x" }), { ok: false, error: "actor-not-staff" });
  assert.deepEqual(await issueChatBanAction({ messageId: message.id, reason: "x" }), { ok: false, error: "actor-not-staff" });
  assert.deepEqual(await issueTemporarySiteBanAction({ messageId: message.id, reason: "x" }), { ok: false, error: "actor-not-staff" });
  assert.deepEqual(await issuePermanentSiteBanAction({ messageId: message.id, reason: "x" }), { ok: false, error: "actor-not-staff" });
});

// ==================================================
// E — USERNAME CHANGES DO NOT AFFECT STAFF AUTHORITY
// ==================================================

test("E1: staff authority is keyed by playerId, not username — changing the username never affects the resolved role", async () => {
  seedUser({ id: "deputy-1", username: "old-deputy-name" });
  assert.equal(await getStaffRole("deputy-1"), "DEPUTY");

  // Simulate a real username change (features/profile/services/change-
  // username.service.ts's own real effect on the User row) by reseeding
  // the SAME id with a new username — the fake's own "one id, one User
  // row" convention makes this an accurate stand-in for that mutation.
  seedUser({ id: "deputy-1", username: "brand-new-name" });

  assert.equal(await getStaffRole("deputy-1"), "DEPUTY", "the role must still resolve correctly after a username change");

  // And the role still works end to end through a real moderation action.
  __setSession({ user: { id: "deputy-1" } });
  const message = seedGlobalChatMessage({ playerId: "player-1" });
  const result = await issueChatBanAction({ messageId: message.id, reason: "spam" });
  assert.equal(result.ok, true);
});

// ==================================================
// F — CONCURRENCY SAFETY, RE-CONFIRMED AT THE ACTION LAYER
// ==================================================

test("F1: two staff members racing a chat ban against the same player through the real actions — exactly one succeeds", async () => {
  const message1 = seedGlobalChatMessage({ playerId: "player-1" });
  const message2 = seedGlobalChatMessage({ playerId: "player-1" });

  // Both sessions are set sequentially, but the two action calls below are
  // awaited together — the fake DB's own $transaction serialization (see
  // prisma.fake.ts's own doc comment) is what actually proves the race is
  // safe, exactly like the real Postgres row lock would.
  __setSession({ user: { id: "support-1" } });
  const callA = issueChatBanAction({ messageId: message1.id, reason: "spam A" });
  __setSession({ user: { id: "deputy-1" } });
  const callB = issueChatBanAction({ messageId: message2.id, reason: "spam B" });

  const [resultA, resultB] = await Promise.all([callA, callB]);
  const successes = [resultA, resultB].filter((result) => result.ok);
  assert.equal(successes.length, 1, "exactly one of the two concurrent chat-ban attempts must succeed");
  assert.equal(getPlayerModerationCountersRow("player-1")?.chatBanCount, 1);
});

// ==================================================
// G — REVOCATION NEVER RESETS PROGRESSION (re-confirmed at the action layer)
// ==================================================

test("G1: revoking a chat ban through the real revoke action never resets the target's next progressive duration", async () => {
  __setSession({ user: { id: "support-1" } });
  const first = await issueChatBanAction({ messageId: seedGlobalChatMessage({ playerId: "player-1" }).id, reason: "spam" });
  assert.equal(first.ok, true);
  if (!first.ok) return;

  // Revocation is OWNER-only (canRevokeBans) — switch sessions before
  // calling it, same as a real staff member escalating to OWNER for this
  // one step would.
  __setSession({ user: { id: "owner-1" } });
  const revoked = await revokeBanAction({ actionId: first.action.id, reason: "appeal accepted" });
  assert.equal(revoked.ok, true);

  __setSession({ user: { id: "support-1" } });
  const second = await issueChatBanAction({ messageId: seedGlobalChatMessage({ playerId: "player-1" }).id, reason: "spam again" });
  assert.equal(second.ok, true);
  if (second.ok) assert.equal(second.durationMinutes, 60, "must be the 2nd-occurrence duration, not reset to 1st");
});
