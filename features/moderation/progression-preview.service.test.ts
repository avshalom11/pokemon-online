// STAFF / MODERATION — PHASE 5 — PROGRESSIVE DURATION UX. Proves the
// preview functions read the target's REAL, server-side counter state
// (never a client-supplied or client-computed value) and feed it through
// the exact same canonical duration tables the real issuing services use.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { previewNextChatBanDurationMinutes, previewNextSiteBanDurationMinutes } from "@/features/moderation/services/progression-preview.service";
import { resetFakeDb, seedPlayerModerationCounters, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "player-1" });
});

// 1 — a player with no history: preview is the 1st-occurrence duration
test("1: a player with no chat-ban history previews the 1st-occurrence duration (15 minutes)", async () => {
  assert.equal(await previewNextChatBanDurationMinutes("player-1"), 15);
});

// 2 — the preview reflects the target's REAL persisted counter, not a client guess
test("2: the preview reflects the target's actual persisted chatBanCount", async () => {
  seedPlayerModerationCounters({ playerId: "player-1", chatBanCount: 2 });
  assert.equal(await previewNextChatBanDurationMinutes("player-1"), 12 * 60, "the 3rd occurrence (count 2 + 1) is 12 hours");
});

// 3 — ceiling behavior matches the canonical table
test("3: a player with 10 prior chat bans still previews the 6th+ ceiling (7 days)", async () => {
  seedPlayerModerationCounters({ playerId: "player-1", chatBanCount: 10 });
  assert.equal(await previewNextChatBanDurationMinutes("player-1"), 7 * 24 * 60);
});

// 4 — site-ban preview is fully independent of chat-ban history
test("4: the site-ban preview is independent of any chat-ban history for the same player", async () => {
  seedPlayerModerationCounters({ playerId: "player-1", chatBanCount: 10, siteBanCount: 0 });
  assert.equal(await previewNextSiteBanDurationMinutes("player-1"), 30, "the player's first SITE ban, despite 10 prior chat bans");
});

// 5 — site-ban canonical table
test("5: the site-ban preview matches the canonical table at a mid-progression count", async () => {
  seedPlayerModerationCounters({ playerId: "player-1", siteBanCount: 3 });
  assert.equal(await previewNextSiteBanDurationMinutes("player-1"), 3 * 24 * 60, "the 4th occurrence (count 3 + 1) is 3 days");
});
