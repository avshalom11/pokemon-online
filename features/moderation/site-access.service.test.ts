// STAFF / MODERATION — PHASE 4 — the pure DECISION function
// lib/auth/auth-session.ts's getCurrentSession calls (resolveSiteBanRedirectPath)
// and the banned-experience view app/banned/page.tsx reads
// (getBannedExperienceView) — both exercised against the fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getBannedExperienceView } from "@/features/moderation/services/banned-experience.service";
import { resolveSiteBanRedirectPath } from "@/features/moderation/services/site-access.service";
import { resetFakeDb, seedModerationAction, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "player-1" });
});

// 1 — no ban at all
test("1: a player with no ban history is never redirected, and has nothing to show on the banned page", async () => {
  assert.equal(await resolveSiteBanRedirectPath("player-1"), null);
  assert.equal(await getBannedExperienceView("player-1"), null);
});

// 2 — active temporary site ban blocks
test("2: an active temporary site ban redirects to /banned and reports type 'temporary' with its real expiry", async () => {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "site_ban",
    expiresAt,
  });
  assert.equal(await resolveSiteBanRedirectPath("player-1"), "/banned");

  const view = await getBannedExperienceView("player-1");
  assert.deepEqual(view, { type: "temporary", expiresAt: expiresAt.toISOString() });
});

// 3 — active permanent site ban blocks
test("3: an active permanent site ban redirects to /banned and reports type 'permanent' with no expiry", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "permanent_site_ban",
  });
  assert.equal(await resolveSiteBanRedirectPath("player-1"), "/banned");

  const view = await getBannedExperienceView("player-1");
  assert.deepEqual(view, { type: "permanent" });
});

// 4 — an expired temporary site ban does not block
test("4: an expired temporary site ban does not block access", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "site_ban",
    expiresAt: new Date(Date.now() - 60_000),
  });
  assert.equal(await resolveSiteBanRedirectPath("player-1"), null);
  assert.equal(await getBannedExperienceView("player-1"), null);
});

// 5 — a revoked temporary site ban does not block, even while still unexpired
test("5: a revoked (but not yet expired) temporary site ban does not block access", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "site_ban",
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: new Date(),
    revokedByPlayerId: "owner-1",
  });
  assert.equal(await resolveSiteBanRedirectPath("player-1"), null);
});

// 6 — a revoked permanent site ban does not block
test("6: a revoked permanent site ban does not block access", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "permanent_site_ban",
    revokedAt: new Date(),
    revokedByPlayerId: "owner-1",
  });
  assert.equal(await resolveSiteBanRedirectPath("player-1"), null);
  assert.equal(await getBannedExperienceView("player-1"), null);
});

// 7 — a chat ban alone never blocks site access
test("7: an active chat ban (no site ban) never redirects to /banned", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "chat_ban",
    expiresAt: new Date(Date.now() + 60_000),
  });
  assert.equal(await resolveSiteBanRedirectPath("player-1"), null);
  assert.equal(await getBannedExperienceView("player-1"), null);
});

// 8 — no staff identity, internal ids, or reasons ever leak into the view
test("8: getBannedExperienceView exposes only { type, expiresAt } — no actor, id, or reason fields", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "site_ban",
    reason: "internal staff note",
    expiresAt: new Date(Date.now() + 60_000),
  });
  const view = await getBannedExperienceView("player-1");
  assert.ok(view);
  assert.deepEqual(Object.keys(view).sort(), ["expiresAt", "type"]);
});

// 9 — a permanent ban takes priority if both were somehow simultaneously active
test("9: a permanent ban takes priority over a coexisting temporary one", async () => {
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "site_ban",
    expiresAt: new Date(Date.now() + 60_000),
  });
  seedModerationAction({
    targetPlayerId: "player-1",
    actorPlayerId: "staff-1",
    actionType: "permanent_site_ban",
  });
  const view = await getBannedExperienceView("player-1");
  assert.deepEqual(view, { type: "permanent" });
});

// 10 — another player's ban never leaks onto this player
test("10: a ban on a different player never affects this player's own redirect/view", async () => {
  seedPlayerProfile({ id: "player-2" });
  seedModerationAction({
    targetPlayerId: "player-2",
    actorPlayerId: "staff-1",
    actionType: "permanent_site_ban",
  });
  assert.equal(await resolveSiteBanRedirectPath("player-1"), null);
  assert.equal(await getBannedExperienceView("player-1"), null);
});
