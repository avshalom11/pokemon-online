// AUTH SECURITY — SECURITY NOTIFICATION — real, behavioral coverage of
// notifySecurityLoginLockout (lib/auth/player-profile.ts). Imported via a
// RELATIVE path deliberately, not the "@/lib/auth/player-profile" alias:
// the test harness's alias-loader.mjs redirects that bare specifier to
// test/support/fakes/player-profile.fake.ts (a stand-in every OTHER test
// in this codebase relies on), so a relative import is the only way to
// reach the REAL implementation under test here. player-profile.ts itself
// has no next/headers dependency (unlike lib/auth/actions.ts/auth.ts), so
// this is directly testable/importable, unusually for this module.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { notifySecurityLoginLockout } from "./player-profile.ts";
import { getNotificationsFor, resetFakeDb, seedPlayerProfile, seedUser } from "../../test/support/fakes/prisma.fake.ts";

const USER_ID = "user-1";
const PLAYER_ID = USER_ID; // this fake's own "profile id == session user id" convention

beforeEach(() => {
  resetFakeDb();
});

test("creates exactly one SECURITY_LOGIN_LOCKOUT notification for the real account matching the identifier", async () => {
  seedPlayerProfile({ id: PLAYER_ID, username: "avshalom" });

  await notifySecurityLoginLockout("avshalom", false);

  const notifications = getNotificationsFor(PLAYER_ID);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "SECURITY_LOGIN_LOCKOUT");
});

test("the notification message never contains an IP address or any other security/network detail", async () => {
  seedPlayerProfile({ id: PLAYER_ID, username: "avshalom" });

  await notifySecurityLoginLockout("avshalom", false);

  const [notification] = getNotificationsFor(PLAYER_ID);
  assert.equal(notification.message, "זוהו מספר ניסיונות התחברות כושלים לחשבון שלך.");
  // No dotted-quad/IPv6-shaped substring anywhere in the stored text.
  assert.ok(!/\d+\.\d+\.\d+\.\d+/.test(notification.message));
});

test("resolves by email when isEmail is true", async () => {
  seedUser({ id: USER_ID, username: "avshalom", email: "avshalom@example.com" });
  seedPlayerProfile({ id: PLAYER_ID });

  await notifySecurityLoginLockout("avshalom@example.com", true);

  assert.equal(getNotificationsFor(PLAYER_ID).length, 1);
});

test("notifies nobody when the identifier has no matching account — never creates a User row or infers one", async () => {
  await assert.doesNotReject(() => notifySecurityLoginLockout("nobody-real", false));
  assert.equal(getNotificationsFor(PLAYER_ID).length, 0);
});

test("never throws even if notification creation fails internally (swallowed, never affects the caller)", async () => {
  // No PlayerProfile seeded for this user at all — findUnique returns
  // null, and the function must simply return, not throw.
  seedUser({ id: USER_ID, username: "profileless" });
  await assert.doesNotReject(() => notifySecurityLoginLockout("profileless", false));
});
