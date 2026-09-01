// STAFF / MODERATION — PHASE 6 — the authoritative staff-management
// orchestration (appointStaffMember/removeStaffMember), exercised against
// the fake DB. Never creates real DEV staff — this file only ever touches
// the isolated in-memory fake.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { appointStaffMember, removeStaffMember } from "@/features/moderation/services/manage-staff.service";
import { getStaffRole } from "@/features/moderation/services/staff-role.service";
import {
  getModerationActionRowsForPlayer,
  getStaffRosterCounterRow,
  resetFakeDb,
  seedPlayerProfile,
  seedStaffMember,
} from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerProfile({ id: "player-1" });
  seedPlayerProfile({ id: "player-2" });
  seedPlayerProfile({ id: "player-3" });
  seedPlayerProfile({ id: "player-4" });
  seedStaffMember({ playerId: "owner-1", role: "OWNER" });
});

// 1 — OWNER can appoint DEPUTY
test("1: OWNER can appoint a plain player as DEPUTY", async () => {
  const result = await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1", role: "DEPUTY" });
  assert.equal(result.ok, true);
  assert.equal(await getStaffRole("player-1"), "DEPUTY");
});

// 2 — second DEPUTY rejected
test("2: a second DEPUTY appointment is rejected once the cap of 1 is reached", async () => {
  const first = await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1", role: "DEPUTY" });
  assert.equal(first.ok, true);

  const second = await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-2", role: "DEPUTY" });
  assert.deepEqual(second, { ok: false, error: "role-cap-reached" });
  assert.equal(await getStaffRole("player-2"), null);
});

// 3 — OWNER can appoint up to 3 SUPPORT
test("3: OWNER can appoint 3 plain players as SUPPORT", async () => {
  for (const targetPlayerId of ["player-1", "player-2", "player-3"]) {
    const result = await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId, role: "SUPPORT" });
    assert.equal(result.ok, true);
  }
  assert.equal(getStaffRosterCounterRow()?.supportCount, 3);
});

// 4 — fourth SUPPORT rejected
test("4: a 4th SUPPORT appointment is rejected once the cap of 3 is reached", async () => {
  for (const targetPlayerId of ["player-1", "player-2", "player-3"]) {
    await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId, role: "SUPPORT" });
  }
  const fourth = await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-4", role: "SUPPORT" });
  assert.deepEqual(fourth, { ok: false, error: "role-cap-reached" });
  assert.equal(await getStaffRole("player-4"), null);
});

// 5 — OWNER can remove DEPUTY
test("5: OWNER can remove an appointed DEPUTY", async () => {
  await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1", role: "DEPUTY" });
  const result = await removeStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1" });
  assert.deepEqual(result, { ok: true });
  assert.equal(await getStaffRole("player-1"), null);
});

// 6 — OWNER can remove SUPPORT
test("6: OWNER can remove an appointed SUPPORT", async () => {
  await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1", role: "SUPPORT" });
  const result = await removeStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1" });
  assert.deepEqual(result, { ok: true });
});

// 7 — OWNER cannot remove/demote self
test("7: OWNER cannot remove itself", async () => {
  const result = await removeStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "owner-1" });
  assert.deepEqual(result, { ok: false, error: "self-target" });
  assert.equal(await getStaffRole("owner-1"), "OWNER");
});

// 8 — forged/invalid role appointment rejected, including an attempted OWNER grant
test("8: appointStaffMember rejects a forged role, including an attempted OWNER grant", async () => {
  const ownerAttempt = await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1", role: "OWNER" });
  assert.deepEqual(ownerAttempt, { ok: false, error: "invalid-role" });

  const nonsenseAttempt = await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1", role: "HACKER" });
  assert.deepEqual(nonsenseAttempt, { ok: false, error: "invalid-role" });

  assert.equal(await getStaffRole("player-1"), null);
});

// 9 — a non-OWNER cannot appoint anyone
test("9: a DEPUTY (not OWNER) cannot appoint a SUPPORT", async () => {
  await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1", role: "DEPUTY" });
  const result = await appointStaffMember({ actorPlayerId: "player-1", targetPlayerId: "player-2", role: "SUPPORT" });
  assert.deepEqual(result, { ok: false, error: "not-owner" });
});

// 10 — appointment creates an audit ModerationAction row
test("10: a successful appointment creates a role_grant audit row with the granted role in metadata", async () => {
  await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1", role: "SUPPORT" });
  const audit = getModerationActionRowsForPlayer("player-1");
  assert.equal(audit.length, 1);
  assert.equal(audit[0]?.actionType, "role_grant");
  assert.equal(audit[0]?.actorPlayerId, "owner-1");
  assert.deepEqual(audit[0]?.metadata, { role: "SUPPORT" });
});

// 11 — removal creates an audit ModerationAction row with the role that was held
test("11: a successful removal creates a role_revoke audit row recording the role that was removed", async () => {
  await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1", role: "DEPUTY" });
  await removeStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1" });

  const audit = getModerationActionRowsForPlayer("player-1");
  const revokeEntry = audit.find((row) => row.actionType === "role_revoke");
  assert.ok(revokeEntry);
  assert.deepEqual(revokeEntry?.metadata, { role: "DEPUTY" });
});

// 12 — target-is-owner / self-target protections through appointment too
test("12: appointStaffMember rejects targeting OWNER and rejects OWNER acting on itself", async () => {
  const targetOwner = await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "owner-1", role: "DEPUTY" });
  // self-target is checked before target-is-owner in canChangeStaffRole,
  // and both are true here — either rejection is correct; the important
  // guarantee is that it's rejected, not which specific reason wins.
  assert.equal(targetOwner.ok, false);
});

// 13 — already-staff rejection
test("13: appointing a player who already holds a staff role is rejected", async () => {
  await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1", role: "SUPPORT" });
  const result = await appointStaffMember({ actorPlayerId: "owner-1", targetPlayerId: "player-1", role: "DEPUTY" });
  assert.deepEqual(result, { ok: false, error: "already-staff" });
});
