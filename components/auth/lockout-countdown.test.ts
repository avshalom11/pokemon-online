// LOCKOUT COUNTDOWN — direct coverage. Plain functions, no React/DOM/next
// dependency at all, so unlike LoginForm.tsx itself these are importable
// and testable directly under this project's node:test runner.
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLockoutCountdownMessage, formatLockoutCountdown, getRemainingLockoutMs } from "./lockout-countdown";

test("formatLockoutCountdown: 15:00 for exactly 15 minutes remaining", () => {
  assert.equal(formatLockoutCountdown(15 * 60 * 1000), "15:00");
});

test("formatLockoutCountdown: 00:00 for zero or negative remaining time (never negative minutes/seconds)", () => {
  assert.equal(formatLockoutCountdown(0), "00:00");
  assert.equal(formatLockoutCountdown(-5000), "00:00");
});

test("formatLockoutCountdown: single-digit minutes/seconds are zero-padded", () => {
  assert.equal(formatLockoutCountdown(9 * 1000), "00:09");
  assert.equal(formatLockoutCountdown(65 * 1000), "01:05");
});

test("formatLockoutCountdown: matches the task's own worked example shape (MM:SS, e.g. 14:32)", () => {
  const remainingMs = 14 * 60 * 1000 + 32 * 1000;
  assert.equal(formatLockoutCountdown(remainingMs), "14:32");
});

test("buildLockoutCountdownMessage embeds the formatted countdown in the exact Hebrew wording requested", () => {
  const remainingMs = 14 * 60 * 1000 + 32 * 1000;
  assert.equal(buildLockoutCountdownMessage(remainingMs), "החשבון נעול זמנית. נסה שוב בעוד 14:32");
});

test("getRemainingLockoutMs derives remaining time purely from the authoritative lockedUntil timestamp and an injectable clock — never a value it invents itself", () => {
  const lockedUntil = new Date("2026-01-01T00:15:00.000Z").toISOString();
  const now = new Date("2026-01-01T00:00:00.000Z").getTime();
  assert.equal(getRemainingLockoutMs(lockedUntil, now), 15 * 60 * 1000);
});

test("getRemainingLockoutMs decreases as the injected clock advances — proves the countdown genuinely ticks down rather than staying fixed", () => {
  const lockedUntil = new Date("2026-01-01T00:15:00.000Z").toISOString();
  const t0 = new Date("2026-01-01T00:00:00.000Z").getTime();
  const t1 = t0 + 1000;
  const t2 = t0 + 2000;

  const r0 = getRemainingLockoutMs(lockedUntil, t0);
  const r1 = getRemainingLockoutMs(lockedUntil, t1);
  const r2 = getRemainingLockoutMs(lockedUntil, t2);

  assert.ok(r1 < r0);
  assert.ok(r2 < r1);
  assert.equal(r0 - r1, 1000);
});

test("getRemainingLockoutMs goes negative once the clock passes lockedUntil — formatLockoutCountdown then clamps it to 00:00 (the 'return to normal state' trigger)", () => {
  const lockedUntil = new Date("2026-01-01T00:15:00.000Z").toISOString();
  const after = new Date("2026-01-01T00:15:01.000Z").getTime();

  const remaining = getRemainingLockoutMs(lockedUntil, after);
  assert.ok(remaining < 0);
  assert.equal(formatLockoutCountdown(remaining), "00:00");
});
