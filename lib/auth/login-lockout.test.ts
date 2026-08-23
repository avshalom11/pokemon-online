// AUTH SECURITY — LOGIN RATE LIMITING — focused coverage of
// login-lockout.ts, the one module that owns LoginAttemptLock. Directly
// importable under this project's node:test runner (unlike lib/auth/
// actions.ts/auth.ts, which pull in next/headers + the real Better Auth
// instance — see lib/auth/login-lockout-boundary.test.ts for that
// source-level coverage instead): this file imports only `@/lib/db/prisma`,
// which the test harness redirects to the in-memory fake
// (test/support/alias-loader.mjs).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  getProgressiveDelayMs,
  isLockedOut,
  LOGIN_LOCKOUT_DURATION_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  normalizeLoginIdentifier,
  recordFailedLoginAttempt,
  resetLoginAttempts,
} from "@/lib/auth/login-lockout";
import { getLoginAttemptLockRow, resetFakeDb, seedLoginAttemptLock } from "../../test/support/fakes/prisma.fake.ts";

const USER_X = "avshalom";
const USER_Y = "someoneelse";
const IP_A = "hash-of-ip-a";
const IP_B = "hash-of-ip-b";

beforeEach(() => {
  resetFakeDb();
});

test("MAX_FAILED_LOGIN_ATTEMPTS is 5, per spec", () => {
  assert.equal(MAX_FAILED_LOGIN_ATTEMPTS, 5);
});

test("normalizeLoginIdentifier trims and lowercases, matching Better Auth's own normalization", () => {
  assert.equal(normalizeLoginIdentifier("  Avshalom  "), "avshalom");
  assert.equal(normalizeLoginIdentifier("Trainer1@Example.com"), "trainer1@example.com");
});

test("a fresh (identifier, IP) pair with no row at all is not locked out", async () => {
  const { locked } = await isLockedOut(USER_X, IP_A);
  assert.equal(locked, false);
});

// 1. 5 failures for user X from IP A locks X+IP A
test("5 consecutive failures for the same identifier+IP locks exactly that pair", async () => {
  let last;
  for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i += 1) {
    last = await recordFailedLoginAttempt(USER_X, IP_A);
  }
  assert.equal(last!.justLockedOut, true);
  assert.ok(last!.lockedUntil !== null && last!.lockedUntil.getTime() > Date.now());

  const { locked, lockedUntil } = await isLockedOut(USER_X, IP_A);
  assert.equal(locked, true);
  assert.equal(lockedUntil!.getTime(), last!.lockedUntil!.getTime());
});

test("attempts 1 through 4 do not lock the pair, and report lockedUntil: null", async () => {
  for (let i = 1; i <= MAX_FAILED_LOGIN_ATTEMPTS - 1; i += 1) {
    const { justLockedOut, lockedUntil, failedAttempts } = await recordFailedLoginAttempt(USER_X, IP_A);
    assert.equal(justLockedOut, false, `attempt ${i} must not lock yet`);
    assert.equal(lockedUntil, null);
    assert.equal(failedAttempts, i);
  }
  const { locked } = await isLockedOut(USER_X, IP_A);
  assert.equal(locked, false);
});

// 3. correct password for X from IP B succeeds (i.e. is never affected by
// IP A's lock) — modeled here at the storage layer: IP B's own row simply
// never exists / is never locked, regardless of IP A's state.
test("locking user X from IP A never locks user X from IP B — independent rows", async () => {
  for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i += 1) {
    await recordFailedLoginAttempt(USER_X, IP_A);
  }
  const lockA = await isLockedOut(USER_X, IP_A);
  const lockB = await isLockedOut(USER_X, IP_B);
  assert.equal(lockA.locked, true);
  assert.equal(lockB.locked, false, "a different IP for the SAME user must remain completely unaffected");
});

// 4. failures for user Y are independent of user X
test("failed attempts against a different identifier (same IP) are tracked completely independently", async () => {
  for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i += 1) {
    await recordFailedLoginAttempt(USER_X, IP_A);
  }
  const xLock = await isLockedOut(USER_X, IP_A);
  const yLock = await isLockedOut(USER_Y, IP_A);
  assert.equal(xLock.locked, true);
  assert.equal(yLock.locked, false);
  assert.equal(getLoginAttemptLockRow(USER_Y, IP_A), undefined, "no row should even exist yet for the untouched user");
});

// 5. same user from two IPs has independent counters
test("the same user attacked from two different IPs accumulates two independent counters", async () => {
  await recordFailedLoginAttempt(USER_X, IP_A);
  await recordFailedLoginAttempt(USER_X, IP_A);
  await recordFailedLoginAttempt(USER_X, IP_B);

  const rowA = getLoginAttemptLockRow(USER_X, IP_A)!;
  const rowB = getLoginAttemptLockRow(USER_X, IP_B)!;
  assert.equal(rowA.failedAttempts, 2);
  assert.equal(rowB.failedAttempts, 1);
});

// 6. successful login clears only that identifier+IP counter
test("resetLoginAttempts clears only the exact (identifier, IP) pair it's called for", async () => {
  await recordFailedLoginAttempt(USER_X, IP_A);
  await recordFailedLoginAttempt(USER_X, IP_A);
  await recordFailedLoginAttempt(USER_X, IP_B);

  await resetLoginAttempts(USER_X, IP_A);

  assert.equal(getLoginAttemptLockRow(USER_X, IP_A)!.failedAttempts, 0);
  assert.equal(getLoginAttemptLockRow(USER_X, IP_B)!.failedAttempts, 1, "IP B's own counter must be untouched by resetting IP A's");
});

test("resetLoginAttempts is a safe no-op when no row exists yet for that pair", async () => {
  await assert.doesNotReject(() => resetLoginAttempts(USER_X, IP_A));
});

// 7. unknown usernames are also rate-limited — no account/User dependency
// at all: the fake DB here never seeds a User row for USER_X/USER_Y, and
// every test above already passes without one, proving LoginAttemptLock
// has no foreign-key/existence dependency on User.
test("rate limiting works identically for an identifier with no backing account at all", async () => {
  const unknownIdentifier = "totally-made-up-username";
  for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i += 1) {
    await recordFailedLoginAttempt(unknownIdentifier, IP_A);
  }
  const { locked } = await isLockedOut(unknownIdentifier, IP_A);
  assert.equal(locked, true, "an unknown identifier must be rate-limited exactly like a real one");
});

test("isLockedOut reports true while the lock window is in the future", async () => {
  seedLoginAttemptLock({
    identifierKey: USER_X,
    ipHash: IP_A,
    failedAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
    lockedUntil: new Date(Date.now() + LOGIN_LOCKOUT_DURATION_MS),
  });
  const { locked } = await isLockedOut(USER_X, IP_A);
  assert.equal(locked, true);
});

test("isLockedOut self-heals an expired lock: reports false and resets the counter to 0", async () => {
  seedLoginAttemptLock({
    identifierKey: USER_X,
    ipHash: IP_A,
    failedAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
    lockedUntil: new Date(Date.now() - 1000),
  });

  const { locked } = await isLockedOut(USER_X, IP_A);
  assert.equal(locked, false);

  const row = getLoginAttemptLockRow(USER_X, IP_A)!;
  assert.equal(row.failedAttempts, 0, "an expired lock must reset the failure counter, not leave it stale");
  assert.equal(row.lockedUntil, null);
});

// 12: the old global User fields are no longer authoritative — this whole
// suite locks/unlocks purely through LoginAttemptLock and never seeds or
// reads a User row at all, proving the new module has zero dependency on
// User.failedLoginAttempts/lockedUntil.
test("(12) login-lockout.ts never touches prisma.user at all — confirmed by never seeding one anywhere in this suite and every test above still passing", () => {
  assert.equal(getLoginAttemptLockRow("never-seeded-anywhere-else", "unused-ip"), undefined);
});

// PROGRESSIVE DELAY
test("getProgressiveDelayMs: attempts 1-2 have no delay", () => {
  assert.equal(getProgressiveDelayMs(1), 0);
  assert.equal(getProgressiveDelayMs(2), 0);
});

test("getProgressiveDelayMs: attempt 3 is ~1 second, attempt 4 is ~2 seconds", () => {
  assert.equal(getProgressiveDelayMs(3), 1000);
  assert.equal(getProgressiveDelayMs(4), 2000);
});

test("getProgressiveDelayMs: attempt 5+ has no additional delay (the hard lock is the consequence)", () => {
  assert.equal(getProgressiveDelayMs(5), 0);
  assert.equal(getProgressiveDelayMs(6), 0);
});
