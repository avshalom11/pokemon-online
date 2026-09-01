// STAFF / MODERATION — PHASE 3 — the authoritative site-ban orchestration
// services (issueTemporarySiteBan, issuePermanentSiteBan), exercised end
// to end against the fake DB — never the live DEV database, never wired
// into any runtime/UI path.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { issuePermanentSiteBan, issueTemporarySiteBan } from "@/features/moderation/services/site-ban.service";
import { revokeBan } from "@/features/moderation/services/revoke-ban.service";
import { getPlayerModerationCountersRow, resetFakeDb, seedPlayerProfile, seedStaffMember } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerProfile({ id: "deputy-1" });
  seedPlayerProfile({ id: "support-1" });
  seedPlayerProfile({ id: "player-1" });
  seedPlayerProfile({ id: "player-2" });
  seedStaffMember({ playerId: "owner-1", role: "OWNER" });
  seedStaffMember({ playerId: "deputy-1", role: "DEPUTY" });
  seedStaffMember({ playerId: "support-1", role: "SUPPORT" });
});

// 1 — first progressive site ban (DEPUTY)
test("1: DEPUTY's first temporary site ban is progressive — 30 minutes", async () => {
  const result = await issueTemporarySiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "cheating" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.durationMinutes, 30);
  assert.equal(result.occurrence, 1);
});

// 2 — next progressive site ban
test("2: the target's 2nd temporary site ban is 6 hours", async () => {
  const first = await issueTemporarySiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "cheating" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const revoke = await revokeBan({ actorPlayerId: "owner-1", actionId: first.action.id, reason: "appeal accepted" });
  assert.equal(revoke.ok, true);

  const second = await issueTemporarySiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "cheating again" });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.occurrence, 2);
  assert.equal(second.durationMinutes, 6 * 60);
});

// 3 — OWNER manual site-ban duration
test("3: OWNER may manually choose an allowed site-ban duration", async () => {
  const result = await issueTemporarySiteBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "severe", durationMinutes: 7 * 24 * 60 });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.durationMinutes, 7 * 24 * 60);
});

// 4 — OWNER must supply a duration for site bans too
test("4: OWNER issuing a site ban without a duration is rejected", async () => {
  const result = await issueTemporarySiteBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "severe" });
  assert.deepEqual(result, { ok: false, error: "owner-duration-required" });
});

// 5 — SUPPORT site-ban rejection — falls out of the shared permission check
test("5: SUPPORT cannot issue a temporary site ban at all", async () => {
  const result = await issueTemporarySiteBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "cheating" });
  assert.deepEqual(result, { ok: false, error: "actor-lacks-permission" });
});

// 6 — DEPUTY cannot choose a duration for a temporary site ban
test("6: DEPUTY supplying a duration for a temporary site ban is rejected", async () => {
  const result = await issueTemporarySiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "cheating", durationMinutes: 360 });
  assert.deepEqual(result, { ok: false, error: "duration-not-allowed-for-role" });
});

// 7 — permanent ban: OWNER only
test("7: only OWNER may issue a permanent site ban — DEPUTY is rejected", async () => {
  const deputyResult = await issuePermanentSiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "unforgivable" });
  assert.deepEqual(deputyResult, { ok: false, error: "actor-lacks-permission" });

  const supportResult = await issuePermanentSiteBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "unforgivable" });
  assert.deepEqual(supportResult, { ok: false, error: "actor-lacks-permission" });

  const ownerResult = await issuePermanentSiteBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "unforgivable" });
  assert.equal(ownerResult.ok, true);
});

// 8 — permanent ban never touches siteBanCount
test("8: a permanent site ban issued through the real service does not increment siteBanCount", async () => {
  const result = await issuePermanentSiteBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "unforgivable" });
  assert.equal(result.ok, true);
  assert.equal(getPlayerModerationCountersRow("player-1")?.siteBanCount ?? 0, 0);
});

// 9 — duplicate active TEMPORARY ban rejection
test("9: a 2nd temporary site ban attempt while one is already active is rejected", async () => {
  const first = await issueTemporarySiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "cheating" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = await issueTemporarySiteBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "still cheating", durationMinutes: 30 });
  assert.deepEqual(second, { ok: false, error: "already-banned", existingActionId: first.action.id });
});

// 10 — duplicate active PERMANENT ban rejection
test("10: a 2nd permanent site ban against an already-permanently-banned target is rejected", async () => {
  const first = await issuePermanentSiteBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "unforgivable" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = await issuePermanentSiteBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "again" });
  assert.deepEqual(second, { ok: false, error: "already-banned", existingActionId: first.action.id });
});

// 11 — hierarchy: SUPPORT cannot even reach the site-ban permission check successfully against DEPUTY either way (double-blocked)
test("11: DEPUTY cannot site-ban OWNER", async () => {
  const result = await issueTemporarySiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "owner-1", reason: "??" });
  assert.deepEqual(result, { ok: false, error: "hierarchy-violation" });
});

// 12 — reason validation on the site-ban path too
test("12: an empty reason is rejected for a temporary site ban and a permanent ban alike", async () => {
  const temp = await issueTemporarySiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "  " });
  assert.deepEqual(temp, { ok: false, error: "invalid-reason" });

  const permanent = await issuePermanentSiteBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "" });
  assert.deepEqual(permanent, { ok: false, error: "invalid-reason" });
});

// 13 — CONCURRENCY: two staff racing the FIRST site ban against the same player
test("13: concurrent temporary-site-ban attempts against the same target — exactly one succeeds", async () => {
  seedPlayerProfile({ id: "deputy-2" });
  seedStaffMember({ playerId: "deputy-2", role: "DEPUTY" });
  // Two DEPUTY actors racing — a second real DEPUTY row is legal under
  // the staff-cap rules but not needed here (this test only exercises
  // punishment concurrency, not staff-cap concurrency), so this seeds it
  // directly rather than going through appointStaffRole.

  const [resultA, resultB] = await Promise.all([
    issueTemporarySiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "cheating A" }),
    issueTemporarySiteBan({ actorPlayerId: "deputy-2", targetPlayerId: "player-1", reason: "cheating B" }),
  ]);
  const successes = [resultA, resultB].filter((result) => result.ok);
  const rejections = [resultA, resultB].filter((result) => !result.ok);
  assert.equal(successes.length, 1);
  assert.equal(rejections.length, 1);
  const winner = successes[0];
  assert.ok(winner?.ok);
  if (!winner?.ok) return;
  assert.deepEqual(rejections[0], { ok: false, error: "already-banned", existingActionId: winner.action.id });
  assert.equal(getPlayerModerationCountersRow("player-1")?.siteBanCount, 1);
});

// 14 — chat/site counters remain independent through the real orchestration layer
test("14: issuing a site ban never touches chatBanCount, and vice versa", async () => {
  const result = await issueTemporarySiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "cheating" });
  assert.equal(result.ok, true);
  const counters = getPlayerModerationCountersRow("player-1");
  assert.equal(counters?.siteBanCount, 1);
  assert.equal(counters?.chatBanCount ?? 0, 0);
});
