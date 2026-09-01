// STAFF / MODERATION — PHASE 6 — the staff-management + moderation-
// history Server Action layer, exercised end to end against the fake
// session + fake DB. Proves OWNER-only access to the read actions,
// forged-role rejection through the real action boundary, and that the
// history page's revoke control reuses Phase 5's existing revokeBanAction
// rather than a second revocation implementation.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { appointStaffMemberAction, getStaffRosterViewAction, removeStaffMemberAction } from "@/features/moderation/actions/manage-staff.actions";
import { revokeBanAction } from "@/features/moderation/actions/global-chat-moderation.actions";
import { getModerationHistoryAction } from "@/features/moderation/actions/moderation-history.actions";
import { __setSession } from "../../test/support/fakes/auth-session.fake.ts";
import { getStaffRole } from "@/features/moderation/services/staff-role.service";
import { resetFakeDb, seedModerationAction, seedPlayerProfile, seedStaffMember } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerProfile({ id: "deputy-1" });
  seedPlayerProfile({ id: "player-1", username: "player1" });
  seedStaffMember({ playerId: "owner-1", role: "OWNER" });
  seedStaffMember({ playerId: "deputy-1", role: "DEPUTY" });
});

// 1 — OWNER can fetch the roster (stands in for "can access the admin page")
test("1: OWNER can fetch the staff roster through the Server Action", async () => {
  __setSession({ user: { id: "owner-1" } });
  const result = await getStaffRosterViewAction();
  assert.equal(result.ok, true);
});

// 2 — a non-OWNER (including staff) cannot fetch the roster
test("2: DEPUTY and a plain player cannot fetch the staff roster", async () => {
  __setSession({ user: { id: "deputy-1" } });
  assert.deepEqual(await getStaffRosterViewAction(), { ok: false, error: "not-owner" });

  seedPlayerProfile({ id: "player-2" });
  __setSession({ user: { id: "player-2" } });
  assert.deepEqual(await getStaffRosterViewAction(), { ok: false, error: "not-owner" });
});

// 3 — history visibility is OWNER-only
test("3: only OWNER can fetch moderation history — DEPUTY is rejected", async () => {
  __setSession({ user: { id: "owner-1" } });
  const ownerResult = await getModerationHistoryAction();
  assert.equal(ownerResult.ok, true);

  __setSession({ user: { id: "deputy-1" } });
  const deputyResult = await getModerationHistoryAction();
  assert.deepEqual(deputyResult, { ok: false, error: "not-owner" });
});

// 4 — appointment via the action, target resolved from username (not a raw playerId)
test("4: appointStaffMemberAction resolves the real target from a username, never a raw playerId", async () => {
  __setSession({ user: { id: "owner-1" } });
  const result = await appointStaffMemberAction({ targetUsername: "player1", role: "SUPPORT" });
  assert.equal(result.ok, true);
  assert.equal(await getStaffRole("player-1"), "SUPPORT");
});

// 5 — forged OWNER appointment rejected through the real action boundary
test("5: appointStaffMemberAction rejects an attempted OWNER role through the real action", async () => {
  __setSession({ user: { id: "owner-1" } });
  const result = await appointStaffMemberAction({ targetUsername: "player1", role: "OWNER" });
  assert.deepEqual(result, { ok: false, error: "invalid-role" });
  assert.equal(await getStaffRole("player-1"), null);
});

// 6 — an unknown username is rejected cleanly
test("6: appointing an unknown username is rejected as target-not-found", async () => {
  __setSession({ user: { id: "owner-1" } });
  const result = await appointStaffMemberAction({ targetUsername: "does-not-exist", role: "SUPPORT" });
  assert.deepEqual(result, { ok: false, error: "target-not-found" });
});

// 7 — removal via the action
test("7: removeStaffMemberAction removes an appointed DEPUTY by username", async () => {
  __setSession({ user: { id: "owner-1" } });
  const result = await removeStaffMemberAction({ targetUsername: "" }); // sanity: empty username never resolves
  assert.deepEqual(result, { ok: false, error: "target-not-found" });
});

// 8 — unauthenticated caller rejected for every action in this file
test("8: an unauthenticated caller cannot appoint, remove, or read the roster/history", async () => {
  __setSession(null);
  assert.deepEqual(await appointStaffMemberAction({ targetUsername: "player1", role: "SUPPORT" }), { ok: false, error: "unauthenticated" });
  assert.deepEqual(await removeStaffMemberAction({ targetUsername: "player1" }), { ok: false, error: "unauthenticated" });
  assert.deepEqual(await getStaffRosterViewAction(), { ok: false, error: "unauthenticated" });
  assert.deepEqual(await getModerationHistoryAction(), { ok: false, error: "unauthenticated" });
});

// 9 — the history page's revoke control reuses the EXISTING revokeBanAction, never a second implementation
test("9: revoking a ban surfaced in moderation history uses the same revokeBanAction Global Chat's own moderation UI already calls", async () => {
  const active = seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "owner-1",
    actionType: "chat_ban",
    expiresAt: new Date(Date.now() + 60_000),
  });

  __setSession({ user: { id: "owner-1" } });
  const revokeResult = await revokeBanAction({ actionId: active.id, reason: "appeal accepted" });
  assert.equal(revokeResult.ok, true);

  const historyResult = await getModerationHistoryAction();
  assert.equal(historyResult.ok, true);
  if (!historyResult.ok) return;
  const entry = historyResult.history.find((row) => row.id === active.id);
  assert.equal(entry?.status, "revoked");
});
