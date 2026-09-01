import assert from "node:assert/strict";
import { test } from "node:test";

import { isStaffRole, STAFF_LIMITS } from "@/features/moderation/config/staff-roles.config";
import { canChangeStaffRole, canModerateTarget, getStaffPermissions } from "@/features/moderation/permissions/staff-permissions";

// 1 — role validation
test("1: isStaffRole accepts only the three real staff roles", () => {
  assert.equal(isStaffRole("OWNER"), true);
  assert.equal(isStaffRole("DEPUTY"), true);
  assert.equal(isStaffRole("SUPPORT"), true);
  assert.equal(isStaffRole("PLAYER"), false);
  assert.equal(isStaffRole("owner"), false, "must be case-sensitive, matching every other role/status string in this codebase");
  assert.equal(isStaffRole(""), false);
});

// 2 — permission matrix: PLAYER (null role)
test("2: a plain player (null role) has no moderation permission at all", () => {
  const permissions = getStaffPermissions(null);
  for (const value of Object.values(permissions)) {
    assert.equal(value, false);
  }
});

// 3 — permission matrix: SUPPORT
test("3: SUPPORT can delete chat messages and issue chat bans, nothing else", () => {
  const permissions = getStaffPermissions("SUPPORT");
  assert.equal(permissions.canDeleteChatMessages, true);
  assert.equal(permissions.canIssueChatBans, true);
  assert.equal(permissions.canChooseChatBanDuration, false, "SUPPORT never picks a duration — only progressive");
  assert.equal(permissions.canIssueSiteBans, false);
  assert.equal(permissions.canIssuePermanentSiteBan, false);
  assert.equal(permissions.canRevokeBans, false);
  assert.equal(permissions.canManageStaffRoles, false);
  assert.equal(permissions.canViewModerationHistory, false);
});

// 4 — permission matrix: DEPUTY
test("4: DEPUTY can delete messages, issue progressive chat AND site bans, but never permanent bans or staff management", () => {
  const permissions = getStaffPermissions("DEPUTY");
  assert.equal(permissions.canDeleteChatMessages, true);
  assert.equal(permissions.canIssueChatBans, true);
  assert.equal(permissions.canChooseChatBanDuration, false);
  assert.equal(permissions.canIssueSiteBans, true);
  assert.equal(permissions.canChooseSiteBanDuration, false, "DEPUTY's site bans are progressive, never manual");
  assert.equal(permissions.canIssuePermanentSiteBan, false);
  assert.equal(permissions.canRevokeBans, false);
  assert.equal(permissions.canManageStaffRoles, false);
});

// 5 — permission matrix: OWNER
test("5: OWNER has every permission, including manual duration pickers and staff management", () => {
  const permissions = getStaffPermissions("OWNER");
  for (const [key, value] of Object.entries(permissions)) {
    assert.equal(value, true, `OWNER must have ${key}`);
  }
});

// 6 — hierarchy: OWNER cannot be targeted
test("6: OWNER can never be a valid moderation target, by any role", () => {
  assert.equal(canModerateTarget("OWNER", "OWNER"), false, "not even by OWNER itself");
  assert.equal(canModerateTarget("DEPUTY", "OWNER"), false);
  assert.equal(canModerateTarget("SUPPORT", "OWNER"), false);
});

// 7 — hierarchy: OWNER's allowed targets
test("7: OWNER may moderate DEPUTY, SUPPORT, and plain players", () => {
  assert.equal(canModerateTarget("OWNER", "DEPUTY"), true);
  assert.equal(canModerateTarget("OWNER", "SUPPORT"), true);
  assert.equal(canModerateTarget("OWNER", null), true);
});

// 8 — hierarchy: DEPUTY restrictions
test("8: DEPUTY may moderate SUPPORT and plain players only — never OWNER or another DEPUTY", () => {
  assert.equal(canModerateTarget("DEPUTY", "SUPPORT"), true);
  assert.equal(canModerateTarget("DEPUTY", null), true);
  assert.equal(canModerateTarget("DEPUTY", "OWNER"), false);
  assert.equal(canModerateTarget("DEPUTY", "DEPUTY"), false);
});

// 9 — hierarchy: SUPPORT restrictions
test("9: SUPPORT may moderate plain players only — never SUPPORT, DEPUTY, or OWNER", () => {
  assert.equal(canModerateTarget("SUPPORT", null), true);
  assert.equal(canModerateTarget("SUPPORT", "SUPPORT"), false);
  assert.equal(canModerateTarget("SUPPORT", "DEPUTY"), false);
  assert.equal(canModerateTarget("SUPPORT", "OWNER"), false);
});

// 10 — staff role management: only OWNER
test("10: only OWNER may change a staff role — DEPUTY/SUPPORT/PLAYER are all rejected", () => {
  const base = { actorPlayerId: "actor", targetPlayerId: "target", targetRole: null, newRole: "SUPPORT" } as const;
  assert.deepEqual(canChangeStaffRole({ ...base, actorRole: "DEPUTY" }), { ok: false, reason: "not-owner" });
  assert.deepEqual(canChangeStaffRole({ ...base, actorRole: "SUPPORT" }), { ok: false, reason: "not-owner" });
  assert.deepEqual(canChangeStaffRole({ ...base, actorRole: null }), { ok: false, reason: "not-owner" });
  assert.deepEqual(canChangeStaffRole({ ...base, actorRole: "OWNER" }), { ok: true });
});

// 11 — no self-promotion / self-role-change, even for OWNER
test("11: nobody may change their own staff role, including OWNER acting on themselves", () => {
  const result = canChangeStaffRole({
    actorPlayerId: "same-player",
    actorRole: "OWNER",
    targetPlayerId: "same-player",
    targetRole: null,
    newRole: "DEPUTY",
  });
  assert.deepEqual(result, { ok: false, reason: "self-target" });
});

// 12 — OWNER can never be a role-change target (protection from demotion)
test("12: OWNER can never be the target of a role change, even by OWNER itself acting on a different OWNER-role row", () => {
  const result = canChangeStaffRole({
    actorPlayerId: "owner-actor",
    actorRole: "OWNER",
    targetPlayerId: "some-owner-account",
    targetRole: "OWNER",
    newRole: "DEPUTY",
  });
  assert.deepEqual(result, { ok: false, reason: "target-is-owner" });
});

// 13 — this mechanism can never grant OWNER
test("13: OWNER can never be granted through canChangeStaffRole's newRole", () => {
  const result = canChangeStaffRole({
    actorPlayerId: "owner-actor",
    actorRole: "OWNER",
    targetPlayerId: "target",
    targetRole: null,
    // Cast needed only because the TS type already excludes "OWNER" here —
    // this test proves the RUNTIME guard also holds, not just the type.
    newRole: "OWNER" as "DEPUTY",
  });
  assert.deepEqual(result, { ok: false, reason: "cannot-grant-owner" });
});

// 14 — a valid OWNER appointment of a fresh player
test("14: a valid appointment (OWNER acting on a different plain player) is accepted", () => {
  const result = canChangeStaffRole({
    actorPlayerId: "owner-actor",
    actorRole: "OWNER",
    targetPlayerId: "fresh-player",
    targetRole: null,
    newRole: "SUPPORT",
  });
  assert.deepEqual(result, { ok: true });
});

// 15 — staff limits constants (sanity-checked here since staff-cap.test.ts
// exercises the actual concurrency mechanism against these same numbers).
test("15: staff limits are exactly 1 DEPUTY and 3 SUPPORT", () => {
  assert.deepEqual(STAFF_LIMITS, { DEPUTY: 1, SUPPORT: 3 });
});
