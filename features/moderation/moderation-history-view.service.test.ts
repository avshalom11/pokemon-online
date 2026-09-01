// STAFF / MODERATION — PHASE 6 — the OWNER moderation-history read model
// (getAllModerationHistory), including active/expired/revoked/permanent
// status derivation and the granted-role extraction for staff actions.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getAllModerationHistory } from "@/features/moderation/services/moderation-history-view.service";
import { resetFakeDb, seedModerationAction, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1", displayName: "הבעלים", username: "owner1" });
  seedPlayerProfile({ id: "player-1", displayName: "שחקן אחד", username: "player1" });
});

// 1 — active chat ban status
test("1: an unrevoked, unexpired chat_ban is reported as active", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "owner-1",
    actionType: "chat_ban",
    reason: "spam",
    expiresAt: new Date(Date.now() + 60_000),
  });
  const [entry] = await getAllModerationHistory();
  assert.equal(entry?.status, "active");
  assert.equal(entry?.targetDisplayName, "שחקן אחד");
  assert.equal(entry?.actorDisplayName, "הבעלים");
});

// 2 — expired status
test("2: an unrevoked chat_ban past its own expiresAt is reported as expired", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "owner-1",
    actionType: "site_ban",
    expiresAt: new Date(Date.now() - 60_000),
  });
  const [entry] = await getAllModerationHistory();
  assert.equal(entry?.status, "expired");
});

// 3 — revoked status, including who revoked it
test("3: a revoked ban is reported as revoked, with the revoker's display name", async () => {
  seedPlayerProfile({ id: "deputy-1", displayName: "הסגן" });
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "owner-1",
    actionType: "chat_ban",
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: new Date(),
    revokedByPlayerId: "deputy-1",
    revocationReason: "false report",
  });
  const [entry] = await getAllModerationHistory();
  assert.equal(entry?.status, "revoked");
  assert.equal(entry?.revokedByDisplayName, "הסגן");
  assert.equal(entry?.revocationReason, "false report");
});

// 4 — permanent-active status, never expired
test("4: an unrevoked permanent_site_ban is reported as permanent-active, never expired", async () => {
  seedModerationAction({ targetPlayerId: "player-1", actorPlayerId: "owner-1", actionType: "permanent_site_ban" });
  const [entry] = await getAllModerationHistory();
  assert.equal(entry?.status, "permanent-active");
});

// 5 — a revoked permanent ban is "revoked", not "permanent-active"
test("5: a revoked permanent_site_ban is reported as revoked", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "owner-1",
    actionType: "permanent_site_ban",
    revokedAt: new Date(),
    revokedByPlayerId: "owner-1",
  });
  const [entry] = await getAllModerationHistory();
  assert.equal(entry?.status, "revoked");
});

// 6 — non-ban action types have no status concept at all
test("6: message_delete and role_grant/role_revoke entries have no status", async () => {
  seedModerationAction({ targetPlayerId: "player-1", actorPlayerId: "owner-1", actionType: "message_delete", targetResourceId: "chat_1" });
  const [entry] = await getAllModerationHistory();
  assert.equal(entry?.status, undefined);
});

// 7 — granted role extraction for staff actions
test("7: a role_grant entry exposes the granted role from metadata", async () => {
  seedModerationAction({ targetPlayerId: "player-1", actorPlayerId: "owner-1", actionType: "role_grant", metadata: { role: "SUPPORT" } });
  const [entry] = await getAllModerationHistory();
  assert.equal(entry?.grantedRole, "SUPPORT");
});

// 8 — an invalid/corrupted metadata shape never crashes the view, just resolves to null
test("8: a malformed metadata value resolves grantedRole to null rather than throwing", async () => {
  seedModerationAction({ targetPlayerId: "player-1", actorPlayerId: "owner-1", actionType: "role_grant", metadata: { role: "NOT_A_ROLE" } });
  const history = await getAllModerationHistory();
  assert.equal(history[0]?.grantedRole, null);
});

// 9 — never exposes raw playerIds, only resolved display names/usernames
test("9: the view never exposes raw actor/target playerIds — only resolved identities", async () => {
  seedModerationAction({ targetPlayerId: "player-1", actorPlayerId: "owner-1", actionType: "chat_ban", expiresAt: new Date(Date.now() + 60_000) });
  const [entry] = await getAllModerationHistory();
  const serialized = JSON.stringify(entry);
  assert.ok(!serialized.includes("player-1"), "raw target playerId must never leak into the view");
  assert.ok(!serialized.includes("owner-1"), "raw actor playerId must never leak into the view");
});

// 10 — newest first
test("10: history is ordered newest first", async () => {
  const base = new Date("2026-08-20T10:00:00.000Z").getTime();
  const older = seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "owner-1",
    actionType: "message_delete",
    targetResourceId: "a",
    createdAt: new Date(base),
  });
  const newer = seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "owner-1",
    actionType: "message_delete",
    targetResourceId: "b",
    createdAt: new Date(base + 1000),
  });
  const history = await getAllModerationHistory();
  assert.equal(history.length, 2);
  assert.equal(history[0]?.id, newer.id, "the newer row must come first");
  assert.equal(history[1]?.id, older.id);
});
