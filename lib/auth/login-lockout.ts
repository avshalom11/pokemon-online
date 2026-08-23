import "server-only";

import { prisma } from "@/lib/db/prisma";

// AUTH SECURITY — LOGIN RATE LIMITING (identifier + requester IP), NOT a
// global per-account lockout. The earlier design locked the whole account
// out for 15 minutes after 5 failures from ANYWHERE — that was itself an
// abuse vector: an attacker only needed to know a victim's username to
// deny them access from every device, just by submitting 5 wrong
// passwords. This module keys everything by (identifierKey, ipHash)
// instead (see prisma/schema.prisma's LoginAttemptLock for the full
// architecture notes) — only the offending requester's own source is ever
// blocked; the legitimate owner can always still sign in from a different
// IP/device while an attacker's own is locked out.
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export const LOGIN_LOCKED_MESSAGE =
  "החשבון ננעל זמנית עקב ריבוי ניסיונות התחברות כושלים. נסה שוב בעוד כמה דקות, או אפס את הסיסמה.";

// The SAME normalization sign-in itself applies (email lowercased;
// username lowercased via the username plugin's normalizer in
// lib/auth/auth.ts) — used as the rate-limit key, so this can never
// disagree with which account (if any) sign-in itself would resolve to.
// Deliberately NOT a foreign key to User: rate limiting must cover
// entirely made-up identifiers too (see isLockedOut's own doc comment on
// why unknown identifiers still need to be limited), which would be
// impossible if a row could only exist for a real account.
export function normalizeLoginIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

interface LockState {
  locked: boolean;
  lockedUntil: Date | null;
}

// Checks whether this (identifierKey, ipHash) pair is CURRENTLY locked. A
// lock that has already expired is self-healed here (failedAttempts reset
// to 0, lockedUntil cleared) rather than left stale — otherwise a single
// new failure after the lockout window passed would immediately re-trigger
// the threshold from the old count instead of giving a fresh 5 attempts.
//
// Called for EVERY identifier, including ones that resolve to no real
// account — an attacker probing random usernames must be rate-limited
// exactly like a real one, or the mere ABSENCE of ever seeing a lockout
// response would itself leak "this identifier doesn't exist." No User row
// or lookup is needed for this: the lock lives entirely on
// LoginAttemptLock, keyed by the raw normalized identifier string.
export async function isLockedOut(identifierKey: string, ipHash: string): Promise<LockState> {
  const lock = await prisma.loginAttemptLock.findUnique({
    where: { identifierKey_ipHash: { identifierKey, ipHash } },
    select: { id: true, lockedUntil: true },
  });

  if (!lock || lock.lockedUntil === null) return { locked: false, lockedUntil: null };
  if (lock.lockedUntil.getTime() > Date.now()) return { locked: true, lockedUntil: lock.lockedUntil };

  await prisma.loginAttemptLock.update({
    where: { id: lock.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });
  return { locked: false, lockedUntil: null };
}

// Called after a successful sign-in — clears only THIS (identifierKey,
// ipHash) pair's failure history, never any other IP's counter for the
// same account (per spec: each identifier+IP pair stays independent).
// updateMany rather than update: a row may not exist yet for this pair
// (e.g. the very first login ever from this device), which is a no-op
// here, not an error.
export async function resetLoginAttempts(identifierKey: string, ipHash: string): Promise<void> {
  await prisma.loginAttemptLock.updateMany({
    where: { identifierKey, ipHash },
    data: { failedAttempts: 0, lockedUntil: null },
  });
}

interface RecordFailureResult {
  justLockedOut: boolean;
  lockedUntil: Date | null;
  failedAttempts: number;
}

// Called after every rejected sign-in, for every identifier — see
// isLockedOut's own doc comment on why unknown identifiers are included
// too. Upserts (rather than requiring a pre-existing row) since the first
// failure for a never-before-seen (identifierKey, ipHash) pair has nothing
// to increment yet.
//
// `justLockedOut` is true on exactly the ONE request where failedAttempts
// newly reaches MAX_FAILED_LOGIN_ATTEMPTS — every subsequent request while
// still locked short-circuits at loginAction's own isLockedOut pre-check
// and never reaches this function again, so a caller keying a one-time
// side effect (e.g. a security notification) off `justLockedOut` gets
// "exactly once per lock window" for free, with no separate dedup flag
// needed.
export async function recordFailedLoginAttempt(identifierKey: string, ipHash: string): Promise<RecordFailureResult> {
  const lock = await prisma.loginAttemptLock.upsert({
    where: { identifierKey_ipHash: { identifierKey, ipHash } },
    create: { identifierKey, ipHash, failedAttempts: 1 },
    update: { failedAttempts: { increment: 1 } },
    select: { id: true, failedAttempts: true },
  });

  if (lock.failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOGIN_LOCKOUT_DURATION_MS);
    await prisma.loginAttemptLock.update({
      where: { id: lock.id },
      data: { lockedUntil },
    });
    return { justLockedOut: true, lockedUntil, failedAttempts: lock.failedAttempts };
  }

  return { justLockedOut: false, lockedUntil: null, failedAttempts: lock.failedAttempts };
}

// PROGRESSIVE DELAY (optional hardening on top of the hard 5-attempt
// lock) — attempts 1-2 respond immediately, 3 and 4 add a small server-
// side delay before responding, 5 hits the hard lock (no extra delay
// layered on top — the lock response itself is the consequence). Pure
// function so it's directly unit-testable; the actual `await` on a timer
// happens in the caller (lib/auth/actions.ts's loginAction).
//
// This never blocks the Node.js event loop (a `setTimeout`-based delay
// only defers THIS request's own response; every other concurrent request
// keeps being served normally), so it's safe to use even under load —
// unlike a synchronous sleep, which this deliberately is not.
export function getProgressiveDelayMs(failedAttempts: number): number {
  if (failedAttempts === 3) return 1000;
  if (failedAttempts === 4) return 2000;
  return 0;
}
