// STAFF / MODERATION — PHASE 4 — EXISTING SESSION REVOCATION. Exercises
// issueTemporarySiteBan/issuePermanentSiteBan's new "revoke the target's
// existing Better Auth sessions" side effect (site-ban.service.ts), and
// confirms issueChatBan never does — against the fake DB only.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { issueChatBan } from "@/features/moderation/services/chat-ban.service";
import { issuePermanentSiteBan, issueTemporarySiteBan } from "@/features/moderation/services/site-ban.service";
import {
  getAuthSessionCount,
  getAuthSessionRowsForUser,
  resetFakeDb,
  seedAuthSession,
  seedPlayerProfile,
  seedStaffMember,
} from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerProfile({ id: "deputy-1" });
  seedPlayerProfile({ id: "support-1" });
  seedPlayerProfile({ id: "player-1" });
  seedStaffMember({ playerId: "owner-1", role: "OWNER" });
  seedStaffMember({ playerId: "deputy-1", role: "DEPUTY" });
  seedStaffMember({ playerId: "support-1", role: "SUPPORT" });
  // This fake DB's own established convention treats PlayerProfile.id and
  // the Better Auth User.id it belongs to as the same value (see
  // prisma.fake.ts's own doc comment on playerProfile.findUnique) — so
  // seeding a session for "player-1" here is exactly the session
  // site-ban.service.ts's own userId lookup will resolve to.
  seedAuthSession({ userId: "player-1" });
  seedAuthSession({ userId: "player-1" });
});

// 1 — a successful temporary site ban revokes ALL of the target's existing sessions
test("1: a successful temporary site ban revokes every existing session for the target", async () => {
  assert.equal(getAuthSessionRowsForUser("player-1").length, 2, "sanity: two sessions seeded before the ban");

  const result = await issueTemporarySiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "cheating" });
  assert.equal(result.ok, true);

  assert.equal(getAuthSessionRowsForUser("player-1").length, 0, "every existing session for the banned target must be revoked");
});

// 2 — a successful permanent site ban also revokes existing sessions
test("2: a successful permanent site ban revokes every existing session for the target", async () => {
  const result = await issuePermanentSiteBan({ actorPlayerId: "owner-1", targetPlayerId: "player-1", reason: "unforgivable" });
  assert.equal(result.ok, true);

  assert.equal(getAuthSessionRowsForUser("player-1").length, 0);
});

// 3 — OWNER's manual temporary site ban also revokes sessions
test("3: OWNER's manual temporary site ban also revokes existing sessions", async () => {
  const result = await issueTemporarySiteBan({
    actorPlayerId: "owner-1",
    targetPlayerId: "player-1",
    reason: "severe",
    durationMinutes: 30,
  });
  assert.equal(result.ok, true);
  assert.equal(getAuthSessionRowsForUser("player-1").length, 0);
});

// 4 — a FAILED site-ban attempt (e.g. duplicate active ban) must never revoke sessions
test("4: a rejected site-ban attempt never revokes sessions", async () => {
  const first = await issueTemporarySiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "cheating" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  seedAuthSession({ userId: "player-1" }); // a fresh session issued after the first ban already kicked out the old ones

  const second = await issueTemporarySiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "again" });
  assert.deepEqual(second, { ok: false, error: "already-banned", existingActionId: first.action.id });
  assert.equal(getAuthSessionRowsForUser("player-1").length, 1, "the rejected 2nd attempt must not touch the session created after the 1st ban");
});

// 5 — sessions belonging to OTHER players are never touched
test("5: revocation never touches another player's sessions", async () => {
  seedPlayerProfile({ id: "player-2" });
  seedAuthSession({ userId: "player-2" });

  const result = await issueTemporarySiteBan({ actorPlayerId: "deputy-1", targetPlayerId: "player-1", reason: "cheating" });
  assert.equal(result.ok, true);

  assert.equal(getAuthSessionRowsForUser("player-2").length, 1, "an unrelated player's session must be untouched");
});

// 6 — a CHAT ban must NEVER revoke sessions
test("6: issuing a chat ban does not revoke any session", async () => {
  const before = getAuthSessionCount();
  const result = await issueChatBan({ actorPlayerId: "support-1", targetPlayerId: "player-1", reason: "spam" });
  assert.equal(result.ok, true);

  assert.equal(getAuthSessionCount(), before, "a chat ban must never touch the Session table at all");
  assert.equal(getAuthSessionRowsForUser("player-1").length, 2);
});
