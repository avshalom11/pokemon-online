import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { appointStaffRole, getStaffRole, removeStaffRole } from "@/features/moderation/services/staff-role.service";
import { getStaffMemberRow, getStaffRosterCounterRow, resetFakeDb, seedPlayerProfile, seedStaffMember } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerProfile({ id: "player-1" });
  seedPlayerProfile({ id: "player-2" });
});

// 1
test("1: a plain player with no StaffMember row resolves to a null role", async () => {
  assert.equal(await getStaffRole("player-1"), null);
});

// 2
test("2: getStaffRole resolves a seeded staff row's real role", async () => {
  seedStaffMember({ playerId: "player-1", role: "DEPUTY" });
  assert.equal(await getStaffRole("player-1"), "DEPUTY");
});

// 3
test("3: appointStaffRole creates a real StaffMember row and bumps the roster counter", async () => {
  const result = await appointStaffRole({ targetPlayerId: "player-1", role: "SUPPORT", appointedByPlayerId: "owner-1" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.staffMember.role, "SUPPORT");
  assert.equal(result.staffMember.appointedByPlayerId, "owner-1");
  assert.equal(getStaffMemberRow("player-1")?.role, "SUPPORT");
  assert.equal(getStaffRosterCounterRow()?.supportCount, 1);
  assert.equal(await getStaffRole("player-1"), "SUPPORT");
});

// 4
test("4: appointing a player who already holds a staff role is rejected", async () => {
  seedStaffMember({ playerId: "player-1", role: "SUPPORT" });
  const result = await appointStaffRole({ targetPlayerId: "player-1", role: "DEPUTY", appointedByPlayerId: "owner-1" });
  assert.deepEqual(result, { ok: false, error: "already-staff" });
  assert.equal(getStaffMemberRow("player-1")?.role, "SUPPORT", "the original role must be untouched by the rejected attempt");
});

// 5
test("5: removeStaffRole deletes the row and decrements the roster counter", async () => {
  await appointStaffRole({ targetPlayerId: "player-1", role: "DEPUTY", appointedByPlayerId: "owner-1" });
  assert.equal(getStaffRosterCounterRow()?.deputyCount, 1);

  const result = await removeStaffRole({ targetPlayerId: "player-1" });
  assert.deepEqual(result, { ok: true });
  assert.equal(getStaffMemberRow("player-1"), undefined);
  assert.equal(getStaffRosterCounterRow()?.deputyCount, 0);
  assert.equal(await getStaffRole("player-1"), null);
});

// 6
test("6: removing a plain player who holds no staff role is rejected", async () => {
  const result = await removeStaffRole({ targetPlayerId: "player-1" });
  assert.deepEqual(result, { ok: false, error: "not-staff" });
});

// 7 — OWNER SAFETY
test("7: removeStaffRole refuses to remove an OWNER row, unconditionally", async () => {
  seedStaffMember({ playerId: "owner-1", role: "OWNER" });
  const result = await removeStaffRole({ targetPlayerId: "owner-1" });
  assert.deepEqual(result, { ok: false, error: "cannot-remove-owner" });
  assert.equal(getStaffMemberRow("owner-1")?.role, "OWNER", "the OWNER row must be completely untouched");
});

// 8 — no real OWNER row is ever created by this phase's own test setup
test("8: this phase's own beforeEach never assigns a real OWNER role to any seeded player", async () => {
  assert.equal(await getStaffRole("owner-1"), null, "owner-1 is just a plain seeded player id in these tests, never a real OWNER row");
});
