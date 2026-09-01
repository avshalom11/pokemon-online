// STAFF / MODERATION — PHASE 3 — the authoritative revocation service
// (revokeBan), exercised end to end against the fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { issueChatBan } from "@/features/moderation/services/chat-ban.service";
import { issuePermanentSiteBan } from "@/features/moderation/services/site-ban.service";
import { revokeBan } from "@/features/moderation/services/revoke-ban.service";
import { recordMessageDeletion } from "@/features/moderation/services/moderation-progression.service";
import { resetFakeDb, seedModerationAction, seedPlayerProfile, seedStaffMember } from "../../test/support/fakes/prisma.fake.ts";

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

// 1 — happy path: OWNER revokes an active chat ban
test("1: OWNER may revoke an active chat ban", async () => {
  const issued = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "spam" });
  assert.equal(issued.ok, true);
  if (!issued.ok) return;

  const result = await revokeBan({ actorPlayerId: "owner-1", actionId: issued.action.id, reason: "appeal accepted" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.action.revokedAt instanceof Date);
  assert.equal(result.action.revokedByPlayerId, "owner-1");
  assert.equal(result.action.revocationReason, "appeal accepted");
});

// 2 — OWNER may revoke a permanent ban too
test("2: OWNER may revoke an active permanent site ban", async () => {
  const issued = await issuePermanentSiteBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "unforgivable" });
  assert.equal(issued.ok, true);
  if (!issued.ok) return;

  const result = await revokeBan({ actorPlayerId: "owner-1", actionId: issued.action.id, reason: "new evidence" });
  assert.equal(result.ok, true);
});

// 3 — reject: not found
test("3: revoking a non-existent action id is rejected", async () => {
  const result = await revokeBan({ actorPlayerId: "owner-1", actionId: "does-not-exist", reason: "n/a" });
  assert.deepEqual(result, { ok: false, error: "not-found" });
});

// 4 — reject: not a ban (e.g. a message-deletion audit row)
test("4: revoking a non-ban action (message deletion) is rejected", async () => {
  const deletion = await recordMessageDeletion({
    targetPlayerId: "player-1",
    actorPlayerId: "support-1",
    targetResourceId: "chat_1",
    reason: "spam",
  });
  const result = await revokeBan({ actorPlayerId: "owner-1", actionId: deletion.id, reason: "n/a" });
  assert.deepEqual(result, { ok: false, error: "not-a-ban" });
});

// 5 — reject: already revoked
test("5: revoking an already-revoked action is rejected", async () => {
  const issued = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "spam" });
  assert.equal(issued.ok, true);
  if (!issued.ok) return;

  const first = await revokeBan({ actorPlayerId: "owner-1", actionId: issued.action.id, reason: "appeal accepted" });
  assert.equal(first.ok, true);

  const second = await revokeBan({ actorPlayerId: "owner-1", actionId: issued.action.id, reason: "again" });
  assert.deepEqual(second, { ok: false, error: "already-revoked" });
});

// 6 — reject: already expired
test("6: revoking an already-expired temporary ban is rejected", async () => {
  const expired = seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "support-1",
    actionType: "chat_ban",
    durationMinutes: 15,
    expiresAt: new Date(Date.now() - 60_000),
  });
  const result = await revokeBan({ actorPlayerId: "owner-1", actionId: expired.id, reason: "too late" });
  assert.deepEqual(result, { ok: false, error: "already-expired" });
});

// 7 — a permanent ban (no expiresAt) is never rejected as "expired"
test("7: a permanent ban (no expiresAt at all) is never rejected as already-expired", async () => {
  const issued = await issuePermanentSiteBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "unforgivable" });
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  const result = await revokeBan({ actorPlayerId: "owner-1", actionId: issued.action.id, reason: "new evidence" });
  assert.notDeepEqual(result, { ok: false, error: "already-expired" });
});

// 8 — reject: unauthorized actor (no permission)
test("8: a plain player cannot revoke any ban", async () => {
  seedPlayerProfile({ id: "player-2" });
  const issued = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "spam" });
  assert.equal(issued.ok, true);
  if (!issued.ok) return;

  const result = await revokeBan({ actorPlayerId: "player-2", actionId: issued.action.id, reason: "n/a" });
  assert.deepEqual(result, { ok: false, error: "actor-not-staff" });
});

// 9 — reject: DEPUTY/SUPPORT lack canRevokeBans (Phase 1's own permission matrix)
test("9: DEPUTY and SUPPORT cannot revoke bans — canRevokeBans is OWNER-only today", async () => {
  const issued = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "spam" });
  assert.equal(issued.ok, true);
  if (!issued.ok) return;

  const deputyResult = await revokeBan({ actorPlayerId: "deputy-1", actionId: issued.action.id, reason: "n/a" });
  assert.deepEqual(deputyResult, { ok: false, error: "actor-lacks-permission" });

  const supportResult = await revokeBan({ actorPlayerId: "support-1", actionId: issued.action.id, reason: "n/a" });
  assert.deepEqual(supportResult, { ok: false, error: "actor-lacks-permission" });
});

// 10 — reason validation on revoke
test("10: an empty revocation reason is rejected", async () => {
  const issued = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "spam" });
  assert.equal(issued.ok, true);
  if (!issued.ok) return;

  const result = await revokeBan({ actorPlayerId: "owner-1", actionId: issued.action.id, reason: "   " });
  assert.deepEqual(result, { ok: false, error: "invalid-reason" });
});

// 11 — revocation preserves progression, verified end to end through revokeBan
test("11: revocation through revokeBan never decrements/resets the target's progression counter", async () => {
  const issued = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "spam" });
  assert.equal(issued.ok, true);
  if (!issued.ok) return;

  const revoke = await revokeBan({ actorPlayerId: "owner-1", actionId: issued.action.id, reason: "appeal accepted" });
  assert.equal(revoke.ok, true);

  const second = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "spam again" });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.occurrence, 2, "progression must continue from 2, never reset to 1 by the revocation");
});
