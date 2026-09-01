// STAFF / MODERATION — PHASE 5 — the pure Chat ⋮ menu decision
// (getAvailableChatModerationActions), covering the exact per-role action
// sets the spec calls out, plus the OWNER-message protection.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getAvailableChatModerationActions } from "@/features/moderation/permissions/chat-moderation-menu";

// 1 — SUPPORT menu/action set
test("1: SUPPORT's available actions against a plain player are exactly delete_message + chat_ban", () => {
  assert.deepEqual(getAvailableChatModerationActions("SUPPORT", null), ["delete_message", "chat_ban"]);
});

// 2 — DEPUTY menu/action set
test("2: DEPUTY's available actions against a plain player are exactly delete_message + chat_ban + temporary_site_ban", () => {
  assert.deepEqual(getAvailableChatModerationActions("DEPUTY", null), ["delete_message", "chat_ban", "temporary_site_ban"]);
});

// 3 — OWNER menu/action set
test("3: OWNER's available actions against a plain player include all four kinds", () => {
  assert.deepEqual(getAvailableChatModerationActions("OWNER", null), [
    "delete_message",
    "chat_ban",
    "temporary_site_ban",
    "permanent_site_ban",
  ]);
});

// 4 — OWNER's message can never be moderated, by anyone
test("4: no role's menu ever includes anything against an OWNER-authored message", () => {
  assert.deepEqual(getAvailableChatModerationActions("OWNER", "OWNER"), []);
  assert.deepEqual(getAvailableChatModerationActions("DEPUTY", "OWNER"), []);
  assert.deepEqual(getAvailableChatModerationActions("SUPPORT", "OWNER"), []);
});

// 5 — a plain viewer (not staff) never gets a menu at all
test("5: a plain player (null viewer role) never gets any available actions", () => {
  assert.deepEqual(getAvailableChatModerationActions(null, null), []);
  assert.deepEqual(getAvailableChatModerationActions(null, "SUPPORT"), []);
});

// 6 — hierarchy still applies for the menu, same as real authorization
test("6: SUPPORT gets no menu at all against a DEPUTY or another SUPPORT's message", () => {
  assert.deepEqual(getAvailableChatModerationActions("SUPPORT", "DEPUTY"), []);
  assert.deepEqual(getAvailableChatModerationActions("SUPPORT", "SUPPORT"), []);
});

// 7 — DEPUTY still can't reach permanent_site_ban even against a plain player
test("7: DEPUTY's action set never includes permanent_site_ban, regardless of target", () => {
  const actions = getAvailableChatModerationActions("DEPUTY", null);
  assert.ok(!actions.includes("permanent_site_ban"));
});

// 8 — SUPPORT's action set never includes any site ban
test("8: SUPPORT's action set never includes temporary_site_ban or permanent_site_ban", () => {
  const actions = getAvailableChatModerationActions("SUPPORT", null);
  assert.ok(!actions.includes("temporary_site_ban"));
  assert.ok(!actions.includes("permanent_site_ban"));
});
