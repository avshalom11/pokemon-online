// LOCKOUT COUNTDOWN — pure helpers, deliberately framework-free (no React,
// no DOM) so they're directly unit-testable under this project's plain
// node:test runner, same "pure function, injectable clock" seam
// engine/damage/random.ts's own randomSource param already establishes for
// determinism. LoginForm.tsx is the only caller; it supplies the real
// `Date.now()` on every tick and persists nothing here itself — these
// functions never read/write storage, never start a timer, and never
// invent a duration on their own. The ONLY input they ever derive a
// remaining duration from is the server-provided `lockedUntil` ISO string
// (see AuthActionState.lockedUntil, lib/auth/auth-action-state.ts) — this
// file has no 15-minute constant of its own, so it structurally cannot
// become a second, client-authoritative lock.

// `now` is injectable (defaults to the real clock) purely for tests —
// LoginForm always calls this with no second argument.
export function getRemainingLockoutMs(lockedUntilIso: string, now: number = Date.now()): number {
  return new Date(lockedUntilIso).getTime() - now;
}

// Clamped to "00:00" for any non-positive input (an already-expired lock),
// never a negative minute/second.
export function formatLockoutCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function buildLockoutCountdownMessage(remainingMs: number): string {
  return `החשבון נעול זמנית. נסה שוב בעוד ${formatLockoutCountdown(remainingMs)}`;
}
