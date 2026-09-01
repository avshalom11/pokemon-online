// STAFF / MODERATION — PROFILE SITE-BAN ENTRY POINT — the pure profile ⋮
// menu decision (getAvailableProfileModerationActions), covering the exact
// per-role action sets the spec calls out, plus the OWNER-target
// protection. Same shape as chat-moderation-menu.test.ts's own coverage of
// getAvailableChatModerationActions.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getAvailableProfileModerationActions } from "@/features/moderation/permissions/profile-moderation-menu";

// 1 — SUPPORT never sees any site-ban control
test("1: SUPPORT's available actions against a plain player are empty — SUPPORT has no site-ban permission at all", () => {
  assert.deepEqual(getAvailableProfileModerationActions("SUPPORT", null), []);
});

// 2 — DEPUTY sees temporary only
test("2: DEPUTY's available actions against a plain player are exactly temporary_site_ban", () => {
  assert.deepEqual(getAvailableProfileModerationActions("DEPUTY", null), ["temporary_site_ban"]);
});

// 3 — OWNER sees both
test("3: OWNER's available actions against a plain player include both temporary and permanent site-ban", () => {
  assert.deepEqual(getAvailableProfileModerationActions("OWNER", null), ["temporary_site_ban", "permanent_site_ban"]);
});

// 4 — OWNER's own profile can never be moderated, by anyone
test("4: no role's menu ever includes anything against an OWNER's own profile", () => {
  assert.deepEqual(getAvailableProfileModerationActions("OWNER", "OWNER"), []);
  assert.deepEqual(getAvailableProfileModerationActions("DEPUTY", "OWNER"), []);
  assert.deepEqual(getAvailableProfileModerationActions("SUPPORT", "OWNER"), []);
});

// 5 — a plain viewer (not staff) never gets a menu at all
test("5: a plain player (null viewer role) never gets any available actions", () => {
  assert.deepEqual(getAvailableProfileModerationActions(null, null), []);
  assert.deepEqual(getAvailableProfileModerationActions(null, "SUPPORT"), []);
});

// 6 — hierarchy still applies: same-rank staff can never target each other,
// but a strictly higher rank can still target a lower one (DEPUTY outranks SUPPORT)
test("6: DEPUTY gets no menu against another DEPUTY's profile, but still gets temporary_site_ban against a SUPPORT's (lower rank)", () => {
  assert.deepEqual(getAvailableProfileModerationActions("DEPUTY", "DEPUTY"), []);
  assert.deepEqual(getAvailableProfileModerationActions("DEPUTY", "SUPPORT"), ["temporary_site_ban"]);
});

// 7 — DEPUTY's action set never includes permanent_site_ban, regardless of target
test("7: DEPUTY's action set never includes permanent_site_ban, regardless of target", () => {
  const actions = getAvailableProfileModerationActions("DEPUTY", null);
  assert.ok(!actions.includes("permanent_site_ban"));
});

// 8 — OWNER can moderate DEPUTY/SUPPORT profiles per hierarchy
test("8: OWNER's action set is available against DEPUTY and SUPPORT profiles too", () => {
  assert.deepEqual(getAvailableProfileModerationActions("OWNER", "DEPUTY"), ["temporary_site_ban", "permanent_site_ban"]);
  assert.deepEqual(getAvailableProfileModerationActions("OWNER", "SUPPORT"), ["temporary_site_ban", "permanent_site_ban"]);
});
