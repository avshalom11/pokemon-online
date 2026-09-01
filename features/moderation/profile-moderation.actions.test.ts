// STAFF / MODERATION — PROFILE SITE-BAN ENTRY POINT — the Server Action
// layer itself (features/moderation/actions/profile-moderation.actions.ts),
// exercised end to end against the fake session + fake DB. Same "never
// trust the client" proof global-chat-moderation.actions.test.ts already
// establishes for the chat entry point, but for the profile entry point:
// the client only ever supplies a username (never a raw playerId), the
// target is always resolved server-side from it, and every issuing action
// re-derives its own authorization/hierarchy/duration validation exactly
// like the chat path does — because it calls the SAME underlying services.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  issueProfilePermanentSiteBanAction,
  issueProfileTemporarySiteBanAction,
  previewProfileSiteBanDurationAction,
} from "@/features/moderation/actions/profile-moderation.actions";
import { __setSession } from "../../test/support/fakes/auth-session.fake.ts";
import { getPlayerModerationCountersRow, resetFakeDb, seedPlayerProfile, seedStaffMember } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1", username: "owner1" });
  seedPlayerProfile({ id: "deputy-1", username: "deputy1" });
  seedPlayerProfile({ id: "support-1", username: "support1" });
  seedPlayerProfile({ id: "player-1", username: "player1" });
  seedPlayerProfile({ id: "player-2", username: "player2" });
  seedStaffMember({ playerId: "owner-1", role: "OWNER" });
  seedStaffMember({ playerId: "deputy-1", role: "DEPUTY" });
  seedStaffMember({ playerId: "support-1", role: "SUPPORT" });
});

// 1 — unauthenticated caller is rejected before anything else runs
test("1: an unauthenticated caller cannot issue any profile site ban", async () => {
  __setSession(null);
  assert.deepEqual(await issueProfileTemporarySiteBanAction({ targetUsername: "player1", reason: "x" }), {
    ok: false,
    error: "unauthenticated",
  });
  assert.deepEqual(await issueProfilePermanentSiteBanAction({ targetUsername: "player1", reason: "x" }), {
    ok: false,
    error: "unauthenticated",
  });
});

// 2 — the target is resolved from the real username, never from a raw playerId
test("2: a forged extra field on the request body cannot redirect the target away from the real resolved username", async () => {
  // DEPUTY (not SUPPORT — SUPPORT has no site-ban permission at all) reaches the real issuing path.
  __setSession({ user: { id: "deputy-1" } });

  const forgedParams = { targetUsername: "player1", reason: "spam", targetPlayerId: "player-2" } as {
    targetUsername: string;
    reason: string;
  };
  const result = await issueProfileTemporarySiteBanAction(forgedParams);
  assert.equal(result.ok, true);

  // The real target must be player-1 (resolved from the username) — if the
  // forged targetPlayerId field had been honored instead, player-2's
  // counter would have incremented and player-1's would not.
  assert.equal(getPlayerModerationCountersRow("player-1")?.siteBanCount, 1);
  assert.equal(getPlayerModerationCountersRow("player-2")?.siteBanCount ?? 0, 0);
});

// 3 — SUPPORT has no site-ban permission at all, through the real action
test("3: SUPPORT cannot issue a temporary or permanent site ban from a profile", async () => {
  __setSession({ user: { id: "support-1" } });
  assert.deepEqual(await issueProfileTemporarySiteBanAction({ targetUsername: "player1", reason: "spam" }), {
    ok: false,
    error: "actor-lacks-permission",
  });
  assert.deepEqual(await issueProfilePermanentSiteBanAction({ targetUsername: "player1", reason: "spam" }), {
    ok: false,
    error: "actor-lacks-permission",
  });
});

// 4 — DEPUTY cannot smuggle a duration through the Server Action — always the progressive one
test("4: DEPUTY cannot supply a duration — always gets the progressive one", async () => {
  __setSession({ user: { id: "deputy-1" } });
  const result = await issueProfileTemporarySiteBanAction({ targetUsername: "player1", reason: "spam", durationMinutes: 60 });
  assert.deepEqual(result, { ok: false, error: "duration-not-allowed-for-role" });
});

// 5 — permanent-ban action is OWNER-only, end to end through the real action
test("5: issueProfilePermanentSiteBanAction rejects DEPUTY and SUPPORT, accepts OWNER", async () => {
  __setSession({ user: { id: "deputy-1" } });
  assert.deepEqual(await issueProfilePermanentSiteBanAction({ targetUsername: "player1", reason: "unforgivable" }), {
    ok: false,
    error: "actor-lacks-permission",
  });

  __setSession({ user: { id: "support-1" } });
  assert.deepEqual(await issueProfilePermanentSiteBanAction({ targetUsername: "player1", reason: "unforgivable" }), {
    ok: false,
    error: "actor-lacks-permission",
  });

  __setSession({ user: { id: "owner-1" } });
  const ownerResult = await issueProfilePermanentSiteBanAction({ targetUsername: "player1", reason: "unforgivable" });
  assert.equal(ownerResult.ok, true);
});

// 6 — OWNER can never be a target, even via the profile entry point
test("6: hierarchy rejects any attempt to site-ban OWNER's own profile", async () => {
  __setSession({ user: { id: "deputy-1" } });
  const result = await issueProfileTemporarySiteBanAction({ targetUsername: "owner1", reason: "x" });
  assert.deepEqual(result, { ok: false, error: "hierarchy-violation" });
});

// 7 — reason required, end to end through the real action
test("7: issueProfileTemporarySiteBanAction rejects an empty reason", async () => {
  __setSession({ user: { id: "owner-1" } });
  const result = await issueProfileTemporarySiteBanAction({ targetUsername: "player1", reason: "   ", durationMinutes: 60 });
  assert.deepEqual(result, { ok: false, error: "invalid-reason" });
});

// 8 — OWNER's duration choices are restricted to the canonical values, end to end
test("8: issueProfileTemporarySiteBanAction rejects an OWNER-supplied off-table duration", async () => {
  __setSession({ user: { id: "owner-1" } });
  const result = await issueProfileTemporarySiteBanAction({ targetUsername: "player1", reason: "severe", durationMinutes: 45 });
  assert.deepEqual(result, { ok: false, error: "invalid-owner-duration" });
});

// 9 — OWNER's canonical duration IS accepted
test("9: issueProfileTemporarySiteBanAction accepts one of OWNER's exact canonical durations", async () => {
  __setSession({ user: { id: "owner-1" } });
  const result = await issueProfileTemporarySiteBanAction({ targetUsername: "player1", reason: "severe", durationMinutes: 7 * 24 * 60 });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.durationMinutes, 7 * 24 * 60);
});

// 10 — progressive duration preview is served by the server, re-authorized the same way
test("10: previewProfileSiteBanDurationAction returns the server-computed duration, and is itself authorized", async () => {
  __setSession({ user: { id: "deputy-1" } });
  const result = await previewProfileSiteBanDurationAction({ targetUsername: "player1" });
  assert.deepEqual(result, { ok: true, durationMinutes: 30 });

  __setSession({ user: { id: "player-2" } });
  const unauthorized = await previewProfileSiteBanDurationAction({ targetUsername: "player1" });
  assert.deepEqual(unauthorized, { ok: false, error: "actor-not-staff" });
});

// 11 — a non-existent username is rejected cleanly, never crashes
test("11: an unknown username is rejected as target-not-found through every profile moderation action", async () => {
  __setSession({ user: { id: "owner-1" } });
  assert.deepEqual(await issueProfileTemporarySiteBanAction({ targetUsername: "does-not-exist", reason: "x", durationMinutes: 30 }), {
    ok: false,
    error: "target-not-found",
  });
  assert.deepEqual(await issueProfilePermanentSiteBanAction({ targetUsername: "does-not-exist", reason: "x" }), {
    ok: false,
    error: "target-not-found",
  });
  assert.deepEqual(await previewProfileSiteBanDurationAction({ targetUsername: "does-not-exist" }), {
    ok: false,
    error: "target-not-found",
  });
});

// 12 — this entry point shares the SAME siteBanCount progression the chat
// entry point already uses — never a second, independently-tracked counter.
test("12: a profile-issued site ban advances the SAME siteBanCount counter the chat entry point uses", async () => {
  __setSession({ user: { id: "owner-1" } });
  await issueProfileTemporarySiteBanAction({ targetUsername: "player1", reason: "first", durationMinutes: 30 });
  assert.equal(getPlayerModerationCountersRow("player-1")?.siteBanCount, 1);
});

// 13 — an already-active site ban is rejected with the existing "already-banned" shape, carrying a revocable id
test("13: issuing a second temporary site ban while one is already active is rejected as already-banned", async () => {
  __setSession({ user: { id: "owner-1" } });
  const first = await issueProfileTemporarySiteBanAction({ targetUsername: "player1", reason: "first", durationMinutes: 30 });
  assert.equal(first.ok, true);

  const second = await issueProfileTemporarySiteBanAction({ targetUsername: "player1", reason: "second", durationMinutes: 30 });
  assert.equal(second.ok, false);
  if (second.ok) return;
  assert.equal(second.error, "already-banned");
});
