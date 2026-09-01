// STAFF / MODERATION — PHASE 1/3 — the services under test are exercised
// behaviorally against the real fake DB (same convention every other
// *.service.test.ts in this codebase already establishes) — never against
// the live DEV database. Nothing here ever calls a Server Action or wires
// into any runtime path; this is the persistence/concurrency FOUNDATION
// only. PHASE 3 updated these tests for the new `{ ok, ... }` result
// shapes recordX/revokeModerationAction now return (see
// moderation-progression.service.ts's own doc comments) — the underlying
// role/permission/hierarchy behavior this file never touched is not
// re-verified here (see chat-ban.service.test.ts/site-ban.service.test.ts
// for the new orchestration-layer coverage, and staff-permissions.test.ts/
// owner-bootstrap.test.ts for the still-unchanged Phase 1/2 coverage).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  getModerationHistoryForPlayer,
  recordManualChatBan,
  recordManualSiteBan,
  recordMessageDeletion,
  recordPermanentSiteBan,
  recordProgressiveChatBan,
  recordProgressiveSiteBan,
  revokeModerationAction,
} from "@/features/moderation/services/moderation-progression.service";
import {
  getModerationActionRow,
  getPlayerModerationCountersRow,
  resetFakeDb,
  seedModerationAction,
  seedPlayerProfile,
} from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "target-1" });
  seedPlayerProfile({ id: "target-2" });
  seedPlayerProfile({ id: "staff-1" });
  seedPlayerProfile({ id: "staff-2" });
  seedPlayerProfile({ id: "owner-1" });
});

// Small helper — every recordX call in this file is expected to succeed
// unless a test is specifically asserting the "already-banned" rejection;
// this keeps every other test's own assertions narrow-typed and free of
// repeated `if (!result.ok) throw ...` boilerplate.
function expectOk<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  assert.equal(result.ok, true, `expected an ok:true result, got ${JSON.stringify(result)}`);
  return result as Extract<T, { ok: true }>;
}

// 1
test("1: a first progressive chat ban is 15 minutes and bumps the counter to 1", async () => {
  const result = expectOk(await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
  assert.equal(result.occurrence, 1);
  assert.equal(result.durationMinutes, 15);
  assert.equal(result.action.actionType, "chat_ban");
  assert.equal(getPlayerModerationCountersRow("target-1")?.chatBanCount, 1);
});

// 2 — successive bans need each prior one revoked first (PHASE 3: no
// duplicate-active-ban allowed), which also never resets progression.
test("2: successive progressive chat bans for the same target walk the full progression", async () => {
  const durations: number[] = [];
  for (let i = 0; i < 7; i += 1) {
    const result = expectOk(await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
    durations.push(result.durationMinutes);
    const revoked = await revokeModerationAction({ actionId: result.action.id, revokedByPlayerId: "owner-1" });
    assert.equal(revoked.ok, true);
  }
  assert.deepEqual(durations, [15, 60, 12 * 60, 24 * 60, 3 * 24 * 60, 7 * 24 * 60, 7 * 24 * 60]);
});

// 3
test("3: two players' progressive chat-ban counts never interfere with each other", async () => {
  const first = expectOk(await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
  await revokeModerationAction({ actionId: first.action.id, revokedByPlayerId: "owner-1" });
  await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" });
  const targetTwoResult = expectOk(await recordProgressiveChatBan({ targetPlayerId: "target-2", actorPlayerId: "staff-1" }));
  assert.equal(targetTwoResult.occurrence, 1, "target-2's own first ban must still be occurrence 1");
  assert.equal(getPlayerModerationCountersRow("target-1")?.chatBanCount, 2);
});

// 4 — CONCURRENCY: two staff members racing a FIRST ban for the SAME
// target — PHASE 3's own explicit race. Only one may ever succeed; the
// loser must be rejected as "already-banned" (not silently create a
// second active ban), and the counter must land at exactly 1, never 2 —
// the failed duplicate attempt's own counter increment must be fully
// rolled back (see recordProgressiveChatBan's own doc comment for why).
test("4: two staff members issuing a chat ban for the same target at the same instant — exactly one succeeds, and the counter reflects only the winner", async () => {
  const [resultA, resultB] = await Promise.all([
    recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }),
    recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-2" }),
  ]);
  const outcomes = [resultA, resultB];
  const successes = outcomes.filter((result) => result.ok);
  const rejections = outcomes.filter((result) => !result.ok);
  assert.equal(successes.length, 1, "exactly one of the two concurrent attempts must succeed");
  assert.equal(rejections.length, 1);
  const winner = successes[0];
  assert.ok(winner?.ok);
  if (!winner?.ok) return;
  assert.deepEqual(rejections[0], { ok: false, error: "already-banned", existingActionId: winner.action.id });

  assert.equal(
    getPlayerModerationCountersRow("target-1")?.chatBanCount,
    1,
    "the counter must reflect ONLY the winning attempt — the rejected duplicate's own increment must have been rolled back, never left at 2"
  );
});

// 5 — chat and site counters are fully independent
test("5: chat-ban and site-ban progression counters are independent for the same player", async () => {
  const chatFirst = expectOk(await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
  await revokeModerationAction({ actionId: chatFirst.action.id, revokedByPlayerId: "owner-1" });
  await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" });

  const siteResult = expectOk(await recordProgressiveSiteBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
  assert.equal(siteResult.occurrence, 1, "this player's first SITE ban, despite already having 2 chat bans");
  assert.equal(siteResult.durationMinutes, 30);

  const counters = getPlayerModerationCountersRow("target-1");
  assert.equal(counters?.chatBanCount, 2);
  assert.equal(counters?.siteBanCount, 1);
});

// 6
test("6: site-ban progression matches the canonical table across successive bans", async () => {
  const durations: number[] = [];
  for (let i = 0; i < 6; i += 1) {
    const result = expectOk(await recordProgressiveSiteBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
    durations.push(result.durationMinutes);
    const revoked = await revokeModerationAction({ actionId: result.action.id, revokedByPlayerId: "owner-1" });
    assert.equal(revoked.ok, true);
  }
  assert.deepEqual(durations, [30, 6 * 60, 24 * 60, 3 * 24 * 60, 7 * 24 * 60, 7 * 24 * 60]);
});

// 7 — OWNER manual chat ban: not restricted by progression, but still counts
test("7: OWNER's manual chat ban uses the chosen duration, not the progression table, but still increments the counter", async () => {
  const first = expectOk(await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" })); // occurrence 1 (15m)
  await revokeModerationAction({ actionId: first.action.id, revokedByPlayerId: "owner-1" });

  const manual = expectOk(
    await recordManualChatBan({ targetPlayerId: "target-1", actorPlayerId: "owner-1", durationMinutes: 7 * 24 * 60 })
  );
  assert.equal(manual.durationMinutes, 7 * 24 * 60, "OWNER's own chosen duration, not occurrence 2's table value");
  assert.equal(manual.occurrence, 2);
  assert.equal(getPlayerModerationCountersRow("target-1")?.chatBanCount, 2);
});

// 8
test("8: OWNER's manual chat ban rejects an off-table duration", async () => {
  await assert.rejects(() =>
    recordManualChatBan({ targetPlayerId: "target-1", actorPlayerId: "owner-1", durationMinutes: 45 })
  );
});

// 9
test("9: OWNER's manual site ban rejects an off-table duration", async () => {
  await assert.rejects(() =>
    recordManualSiteBan({ targetPlayerId: "target-1", actorPlayerId: "owner-1", durationMinutes: 45 })
  );
});

// 10 — REVOCATION MUST NOT DECREMENT PROGRESSION (the brief's own explicit example)
test("10: revoking a player's first chat ban early does not reset their next progressive ban back to 1st", async () => {
  const first = expectOk(await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
  assert.equal(first.durationMinutes, 15);

  const revoked = await revokeModerationAction({ actionId: first.action.id, revokedByPlayerId: "owner-1" });
  assert.equal(revoked.ok, true);
  assert.equal(getPlayerModerationCountersRow("target-1")?.chatBanCount, 1, "counter must be untouched by revocation");

  const second = expectOk(await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
  assert.equal(second.occurrence, 2);
  assert.equal(second.durationMinutes, 60, "must be the 2nd-occurrence duration (1 hour), not 1st again");
});

// 11 — revocation sets the right fields and nothing else
test("11: revoking an action sets revokedAt/revokedByPlayerId/revocationReason without touching its own duration/expiresAt", async () => {
  const created = expectOk(await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
  const revoked = expectOk(
    await revokeModerationAction({ actionId: created.action.id, revokedByPlayerId: "owner-1", revocationReason: "false report" })
  );
  assert.ok(revoked.action.revokedAt instanceof Date);
  assert.equal(revoked.action.revokedByPlayerId, "owner-1");
  assert.equal(revoked.action.revocationReason, "false report");
  assert.equal(revoked.action.durationMinutes, created.durationMinutes);
  assert.deepEqual(revoked.action.expiresAt, created.expiresAt);
});

// 11b — PHASE 3: double-revocation is guarded, not silently overwritten
test("11b: revoking an already-revoked action is rejected, and does not overwrite who/why it was revoked", async () => {
  const created = expectOk(await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
  const first = expectOk(
    await revokeModerationAction({ actionId: created.action.id, revokedByPlayerId: "owner-1", revocationReason: "first reason" })
  );
  const second = await revokeModerationAction({ actionId: created.action.id, revokedByPlayerId: "staff-1", revocationReason: "second reason" });
  assert.deepEqual(second, { ok: false, error: "already-revoked" });
  assert.equal(first.action.revokedByPlayerId, "owner-1");
  assert.equal(first.action.revocationReason, "first reason");
});

// 12 — permanent site ban is separate from progression entirely
test("12: a permanent site ban never touches siteBanCount", async () => {
  const permanent = await recordPermanentSiteBan({ targetPlayerId: "target-1", actorPlayerId: "owner-1", reason: "cheating" });
  assert.equal(permanent.ok, true);
  assert.equal(getPlayerModerationCountersRow("target-1")?.siteBanCount ?? 0, 0);

  const nextTemp = expectOk(await recordProgressiveSiteBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
  assert.equal(nextTemp.occurrence, 1, "the permanent ban must not have advanced the temporary-ban progression");
});

// 13 — permanent ban has no duration/expiry
test("13: a permanent site ban row has no durationMinutes/expiresAt", async () => {
  const result = await recordPermanentSiteBan({ targetPlayerId: "target-1", actorPlayerId: "owner-1" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.action.durationMinutes, null);
  assert.equal(result.action.expiresAt, null);
  assert.equal(result.action.actionType, "permanent_site_ban");
});

// 13b — PHASE 3: a second permanent ban against an already-permanently-banned target is rejected
test("13b: a second permanent site ban against the same active target is rejected", async () => {
  const first = await recordPermanentSiteBan({ targetPlayerId: "target-1", actorPlayerId: "owner-1" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = await recordPermanentSiteBan({ targetPlayerId: "target-1", actorPlayerId: "owner-1" });
  assert.deepEqual(second, { ok: false, error: "already-banned", existingActionId: first.action.id });
});

// 14 — message deletion audit record
test("14: a message-deletion audit record carries the target resource id and no duration", async () => {
  const action = await recordMessageDeletion({
    targetPlayerId: "target-1",
    actorPlayerId: "staff-1",
    targetResourceId: "chat_123",
    reason: "spam",
  });
  assert.equal(action.actionType, "message_delete");
  assert.equal(action.targetResourceId, "chat_123");
  assert.equal(action.durationMinutes, null);
  assert.equal(action.expiresAt, null);
});

// 15 — every created action is retrievable from history, most recent first
test("15: getModerationHistoryForPlayer returns every action for that target, newest first", async () => {
  const base = new Date("2026-08-20T10:00:00.000Z").getTime();
  // Explicit, unambiguous createdAt values — never relying on real-clock
  // ordering (two rows created in immediate succession can legitimately
  // land in the very same millisecond), same "explicit createdAt, never
  // real-time timing" convention global-chat.test.ts's own ordering tests
  // already establish.
  const older = seedModerationAction({
    targetPlayerId: "target-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    createdAt: new Date(base),
  });
  const newer = seedModerationAction({
    targetPlayerId: "target-1",
    actorPlayerId: "staff-1",
    actionType: "site_ban",
    createdAt: new Date(base + 1000),
  });

  const history = await getModerationHistoryForPlayer("target-1");
  assert.equal(history.length, 2);
  assert.equal(history[0]?.id, newer.id, "the newer row must come first");
  assert.equal(history[1]?.id, older.id);
  assert.ok(getModerationActionRow(older.id));
});

// 16 — PHASE 3: cannot issue a new chat ban while one is already active
test("16: a new progressive chat ban is rejected while the target already has an active chat ban", async () => {
  const first = expectOk(await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
  assert.ok(first.action.revokedAt === null);

  const second = await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" });
  assert.deepEqual(second, { ok: false, error: "already-banned", existingActionId: first.action.id });
  assert.equal(getPlayerModerationCountersRow("target-1")?.chatBanCount, 1, "the rejected attempt's own counter increment must be rolled back");
});

// 17 — PHASE 3: same duplicate-active-ban rule for site bans
test("17: a new site ban is rejected while the target already has an active site ban", async () => {
  const first = expectOk(await recordProgressiveSiteBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
  assert.ok(first.action.revokedAt === null);

  const second = await recordManualSiteBan({ targetPlayerId: "target-1", actorPlayerId: "owner-1", durationMinutes: 30 });
  assert.deepEqual(second, { ok: false, error: "already-banned", existingActionId: first.action.id });
  assert.equal(getPlayerModerationCountersRow("target-1")?.siteBanCount, 1, "the rejected attempt's own counter increment must be rolled back");
});

// 18 — an expired (but not revoked) ban does not block a new one
test("18: an already-expired chat ban does not block a new one from being issued", async () => {
  seedModerationAction({
    targetPlayerId: "target-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: new Date(Date.now() - 60_000),
    durationMinutes: 15,
  });
  const result = expectOk(await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
  assert.equal(result.occurrence, 1, "the counter starts fresh — the expired seeded row was never issued through this counter");
});

// 19 — a revoked (but not yet expired) ban does not block a new one
test("19: a revoked-but-not-yet-expired chat ban does not block a new one", async () => {
  const first = expectOk(await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" }));
  await revokeModerationAction({ actionId: first.action.id, revokedByPlayerId: "owner-1" });

  const second = await recordProgressiveChatBan({ targetPlayerId: "target-1", actorPlayerId: "staff-1" });
  assert.equal(second.ok, true);
});
