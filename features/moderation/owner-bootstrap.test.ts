// STAFF / MODERATION — PHASE 2 — OWNER bootstrap verification. Exercises
// the role-resolution/permission/hierarchy foundation against a seeded
// OWNER row shaped exactly like the real one-time bootstrap write (a raw
// StaffMember row with role "OWNER", appointedByPlayerId null) — never
// against the real DEV database (that happens once, separately, via the
// reviewed bootstrap script — see this phase's own report). Nothing here
// creates a ModerationAction, touches counters beyond what's asserted, or
// exercises any runtime enforcement path.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { canChangeStaffRole, canModerateTarget, getStaffPermissions } from "@/features/moderation/permissions/staff-permissions";
import {
  appointStaffRole,
  getPlayerStaffRole,
  getStaffRole,
  removeStaffRole,
} from "@/features/moderation/services/staff-role.service";
import { getStaffMemberRow, getStaffRosterCounterRow, resetFakeDb, seedPlayerProfile, seedStaffMember } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-player" });
  seedPlayerProfile({ id: "plain-player" });
});

// 1 — PLAYER fallback
test("1: getPlayerStaffRole returns the literal PLAYER for an account with no StaffMember row", async () => {
  assert.equal(await getPlayerStaffRole("plain-player"), "PLAYER");
  assert.equal(await getStaffRole("plain-player"), null, "the underlying getStaffRole must still return null, unchanged");
});

// 2 — persisted OWNER resolution (the shape the real bootstrap produces)
test("2: a bootstrap-shaped OWNER row (appointedByPlayerId: null) resolves correctly through both lookups", async () => {
  seedStaffMember({ playerId: "owner-player", role: "OWNER", appointedByPlayerId: null });
  assert.equal(await getStaffRole("owner-player"), "OWNER");
  assert.equal(await getPlayerStaffRole("owner-player"), "OWNER");
});

// 3 — invalid persisted role strings are rejected, never silently trusted
test("3: an invalid/corrupted persisted role string throws rather than being silently trusted", async () => {
  seedStaffMember({ playerId: "owner-player", role: "SUPERADMIN" });
  await assert.rejects(() => getStaffRole("owner-player"));
  await assert.rejects(() => getPlayerStaffRole("owner-player"));
});

// 4 — OWNER's full permission set, verified against the actual persisted row
test("4: the actual persisted OWNER row grants every required permission", async () => {
  seedStaffMember({ playerId: "owner-player", role: "OWNER", appointedByPlayerId: null });
  const role = await getStaffRole("owner-player");
  const permissions = getStaffPermissions(role);

  assert.equal(permissions.canDeleteChatMessages, true, "delete global chat message");
  assert.equal(permissions.canChooseChatBanDuration, true, "manual chat ban");
  assert.equal(permissions.canChooseSiteBanDuration, true, "manual temporary site ban");
  assert.equal(permissions.canIssuePermanentSiteBan, true, "permanent site ban");
  assert.equal(permissions.canRevokeBans, true, "revoke/unban");
  assert.equal(permissions.canManageStaffRoles, true, "manage staff");
  assert.equal(permissions.canViewModerationHistory, true, "view moderation history");
});

// 5 — negative permission checks
test("5: SUPPORT cannot site ban, DEPUTY cannot permanently ban, only OWNER manages staff", async () => {
  const support = getStaffPermissions("SUPPORT");
  assert.equal(support.canIssueSiteBans, false);

  const deputy = getStaffPermissions("DEPUTY");
  assert.equal(deputy.canIssuePermanentSiteBan, false);

  assert.equal(getStaffPermissions("OWNER").canManageStaffRoles, true);
  assert.equal(getStaffPermissions("DEPUTY").canManageStaffRoles, false);
  assert.equal(getStaffPermissions("SUPPORT").canManageStaffRoles, false);
  assert.equal(getStaffPermissions("PLAYER").canManageStaffRoles, false);
  assert.equal(getStaffPermissions(null).canManageStaffRoles, false);
});

// 6 — HIERARCHY, against the persisted OWNER role
test("6: the persisted OWNER role cannot be targeted, and can moderate PLAYER/SUPPORT/DEPUTY", async () => {
  seedStaffMember({ playerId: "owner-player", role: "OWNER" });
  const ownerRole = await getStaffRole("owner-player");
  assert.equal(ownerRole, "OWNER");
  if (!ownerRole) return;

  assert.equal(canModerateTarget("OWNER", "OWNER"), false, "OWNER cannot be targeted, including by another OWNER-role value");
  assert.equal(canModerateTarget(ownerRole, "SUPPORT"), true);
  assert.equal(canModerateTarget(ownerRole, "DEPUTY"), true);
  assert.equal(canModerateTarget(ownerRole, null), true);
});

// 7 — DEPUTY cannot target OWNER (no real DEPUTY row needed)
test("7: DEPUTY cannot target OWNER", () => {
  assert.equal(canModerateTarget("DEPUTY", "OWNER"), false);
});

// 8 — SUPPORT cannot target OWNER/DEPUTY/SUPPORT
test("8: SUPPORT cannot target OWNER, DEPUTY, or another SUPPORT", () => {
  assert.equal(canModerateTarget("SUPPORT", "OWNER"), false);
  assert.equal(canModerateTarget("SUPPORT", "DEPUTY"), false);
  assert.equal(canModerateTarget("SUPPORT", "SUPPORT"), false);
});

// 9 — normal staff service cannot create a second OWNER, even if the type is bypassed
test("9: appointStaffRole refuses to create an OWNER, even with the role param force-cast past its type", async () => {
  const result = await appointStaffRole({
    targetPlayerId: "plain-player",
    // Force-cast past Exclude<StaffRole, "OWNER"> — proves the RUNTIME
    // guard added in Phase 2, not just the compile-time type.
    role: "OWNER" as "DEPUTY",
    appointedByPlayerId: "owner-player",
  });
  assert.deepEqual(result, { ok: false, error: "cannot-appoint-owner" });
  assert.equal(getStaffMemberRow("plain-player"), undefined, "no row must be created for the rejected attempt");
});

// 10 — a second OWNER cannot be created through appointStaffRole even when one already exists
test("10: with a real OWNER already persisted, appointStaffRole still refuses to create a second one", async () => {
  seedStaffMember({ playerId: "owner-player", role: "OWNER" });
  const result = await appointStaffRole({
    targetPlayerId: "plain-player",
    role: "OWNER" as "SUPPORT",
    appointedByPlayerId: "owner-player",
  });
  assert.deepEqual(result, { ok: false, error: "cannot-appoint-owner" });
  assert.equal(await getStaffRole("owner-player"), "OWNER", "the real OWNER row must be completely untouched");
  assert.equal(await getStaffRole("plain-player"), null);
});

// 11 — normal staff service cannot remove/demote the persisted OWNER
test("11: removeStaffRole refuses to remove the persisted OWNER row", async () => {
  seedStaffMember({ playerId: "owner-player", role: "OWNER" });
  const result = await removeStaffRole({ targetPlayerId: "owner-player" });
  assert.deepEqual(result, { ok: false, error: "cannot-remove-owner" });
  assert.equal(await getStaffRole("owner-player"), "OWNER", "OWNER must still be OWNER after the rejected removal attempt");
});

// 12 — no self-change path exists for OWNER either, at the pure hierarchy-rule layer
test("12: canChangeStaffRole rejects OWNER acting on itself even for a no-op-shaped request", () => {
  const result = canChangeStaffRole({
    actorPlayerId: "owner-player",
    actorRole: "OWNER",
    targetPlayerId: "owner-player",
    targetRole: "OWNER",
    newRole: "DEPUTY",
  });
  assert.equal(result.ok, false);
});

// 13 — OWNER bootstrap must never consume the DEPUTY/SUPPORT roster counters
test("13: creating an OWNER row directly (the real bootstrap's own shape) never touches StaffRosterCounter", async () => {
  // Mirrors the real bootstrap exactly: a raw StaffMember row, never
  // routed through appointStaffRole (which both refuses "OWNER" now and
  // would have touched the counter for DEPUTY/SUPPORT anyway).
  seedStaffMember({ playerId: "owner-player", role: "OWNER", appointedByPlayerId: null });
  assert.equal(getStaffRosterCounterRow(), undefined, "no StaffRosterCounter row should exist at all from an OWNER-only bootstrap");
});

// 14 — appointing a real DEPUTY afterward still starts from a clean counter
test("14: after an OWNER bootstrap, a subsequent DEPUTY appointment still starts counting from 0", async () => {
  seedStaffMember({ playerId: "owner-player", role: "OWNER", appointedByPlayerId: null });
  const result = await appointStaffRole({ targetPlayerId: "plain-player", role: "DEPUTY", appointedByPlayerId: "owner-player" });
  assert.equal(result.ok, true);
  assert.equal(getStaffRosterCounterRow()?.deputyCount, 1);
  assert.equal(getStaffRosterCounterRow()?.supportCount, 0);
});
