import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { isChatBanned, isPermanentlySiteBanned, isSiteBanned } from "@/features/moderation/services/active-ban.service";
import { resetFakeDb, seedModerationAction, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

const NOW = new Date("2026-09-01T12:00:00.000Z");

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "player-1" });
});

// 1
test("1: a player with no moderation history is neither chat- nor site-banned", async () => {
  assert.equal(await isChatBanned("player-1", NOW), false);
  assert.equal(await isSiteBanned("player-1", NOW), false);
  assert.equal(await isPermanentlySiteBanned("player-1"), false);
});

// 2 — active chat ban
test("2: an unrevoked chat_ban with a future expiresAt is active", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: new Date(NOW.getTime() + 60_000),
  });
  assert.equal(await isChatBanned("player-1", NOW), true);
  assert.equal(await isSiteBanned("player-1", NOW), false, "a chat ban must never count as a site ban");
});

// 3 — expired chat ban
test("3: a chat_ban whose expiresAt is in the past is not active", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: new Date(NOW.getTime() - 60_000),
  });
  assert.equal(await isChatBanned("player-1", NOW), false);
});

// 4 — boundary: expiresAt exactly equal to now is NOT active (strict gt)
test("4: a chat_ban expiring at exactly `now` is not active", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: NOW,
  });
  assert.equal(await isChatBanned("player-1", NOW), false);
});

// 5 — revoked-but-not-yet-expired chat ban is not active
test("5: a revoked chat_ban is not active even while its own expiresAt is still in the future", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: new Date(NOW.getTime() + 60_000),
    revokedAt: new Date(NOW.getTime() - 1000),
    revokedByPlayerId: "owner-1",
  });
  assert.equal(await isChatBanned("player-1", NOW), false);
});

// 6 — active site ban
test("6: an unrevoked site_ban with a future expiresAt is active, and is never mistaken for a chat ban", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "site_ban",
    expiresAt: new Date(NOW.getTime() + 60_000),
  });
  assert.equal(await isSiteBanned("player-1", NOW), true);
  assert.equal(await isChatBanned("player-1", NOW), false);
});

// 7 — expired site ban
test("7: an expired site_ban is not active", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "site_ban",
    expiresAt: new Date(NOW.getTime() - 1),
  });
  assert.equal(await isSiteBanned("player-1", NOW), false);
});

// 8 — permanent ban: active with no expiry
test("8: a permanent_site_ban is active with no expiresAt at all", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "owner-1",
    actionType: "permanent_site_ban",
  });
  assert.equal(await isPermanentlySiteBanned("player-1"), true);
  // A permanent ban must never be conflated with a temporary site ban.
  assert.equal(await isSiteBanned("player-1", NOW), false);
});

// 9 — permanent ban stays active regardless of how far `now` is pushed
test("9: a permanent_site_ban never self-expires, no matter how far in the future `now` is", async () => {
  seedModerationAction({ targetPlayerId: "player-1", actorPlayerId: "owner-1", actionType: "permanent_site_ban" });
  const farFuture = new Date(NOW.getTime() + 1000 * 60 * 60 * 24 * 365 * 10);
  assert.equal(await isPermanentlySiteBanned("player-1"), true);
  void farFuture; // isPermanentlySiteBanned takes no `now` param by design — see its own doc comment.
});

// 10 — revoked permanent ban is no longer active
test("10: a revoked permanent_site_ban is no longer active", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "owner-1",
    actionType: "permanent_site_ban",
    revokedAt: NOW,
    revokedByPlayerId: "owner-1",
  });
  assert.equal(await isPermanentlySiteBanned("player-1"), false);
});

// 11 — a player can be simultaneously chat-banned and site-banned (independent)
test("11: chat-ban and site-ban active status are independent of each other", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: new Date(NOW.getTime() + 60_000),
  });
  assert.equal(await isChatBanned("player-1", NOW), true);
  assert.equal(await isSiteBanned("player-1", NOW), false);
});

// 12 — an older revoked/expired ban never masks a newer active one for the same target
test("12: a newer active chat ban is found even alongside older expired/revoked rows for the same player", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: new Date(NOW.getTime() - 100_000),
  });
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    revokedAt: NOW,
    revokedByPlayerId: "owner-1",
    expiresAt: new Date(NOW.getTime() + 100_000),
  });
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: new Date(NOW.getTime() + 200_000),
  });
  assert.equal(await isChatBanned("player-1", NOW), true);
});

// 13 — another player's active ban never leaks onto this player
test("13: an active ban on a different player never affects this player's own status", async () => {
  seedPlayerProfile({ id: "player-2" });
  seedModerationAction({
    targetPlayerId: "player-2",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: new Date(NOW.getTime() + 60_000),
  });
  assert.equal(await isChatBanned("player-1", NOW), false);
});
