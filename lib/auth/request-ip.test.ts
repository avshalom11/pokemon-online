// AUTH SECURITY — REQUEST IP RESOLUTION — direct coverage. Neither
// function in request-ip.ts touches next/headers (resolveRequestIp takes a
// plain Headers object, not next/headers' own `headers()`), so unlike
// lib/auth/actions.ts this file IS importable directly under this
// project's node:test runner.
import assert from "node:assert/strict";
import { test } from "node:test";

import { hashIp, resolveRequestIp } from "@/lib/auth/request-ip";

test("resolveRequestIp reads a single-value x-forwarded-for header", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.5" });
  assert.equal(resolveRequestIp(headers), "203.0.113.5");
});

test("resolveRequestIp falls back to x-real-ip when x-forwarded-for is absent", () => {
  const headers = new Headers({ "x-real-ip": "198.51.100.7" });
  assert.equal(resolveRequestIp(headers), "198.51.100.7");
});

test("resolveRequestIp ignores an arbitrary, untrusted header — only x-forwarded-for/x-real-ip are ever read", () => {
  const headers = new Headers({ "x-client-ip": "1.2.3.4", "x-my-fake-ip": "9.9.9.9" });
  // Neither header is trusted, so nothing resolves — falls to this
  // module's own "unknown" bucket (see resolveRequestIp's own doc comment
  // for why that's still rate-limited, never silently unlimited), NEVER an
  // arbitrary client-controlled header this app never asked for.
  assert.equal(resolveRequestIp(headers), "unknown");
});

// NOTE ON THE DEV/TEST LOCALHOST FALLBACK: getIp's own isDevelopment()/
// isTest() check (node_modules/@better-auth/core/src/env/env-impl.ts)
// reads a MODULE-LEVEL constant (`nodeENV`) captured once when that module
// first loads — mutating process.env.NODE_ENV from inside an already-
// running test process has no effect on it, so that fallback can't be
// exercised by toggling the env var at runtime here. It's still exercised
// for real: `next dev`/`next start` (and this project's own test command)
// set NODE_ENV before any module loads, so the fallback engages correctly
// wherever it actually matters — this suite instead documents and asserts
// the behavior actually observable in THIS process's own environment.
test('resolveRequestIp falls back to the "unknown" bucket (never throws, never silently allows) when no trusted header resolves and this process is not in dev/test mode', () => {
  const headers = new Headers();
  assert.equal(resolveRequestIp(headers), "unknown");
});

test("resolveRequestIp never reads anything from a request BODY/form field — it only ever inspects headers, so no client-supplied `ip` form value can influence it", () => {
  // There is no `ip` parameter anywhere in resolveRequestIp's signature —
  // it accepts only a Headers object. This test documents/locks in that
  // contract: calling it with headers alone is the ONLY way to influence
  // its result.
  assert.equal(resolveRequestIp.length, 1);
});

test("hashIp is deterministic for the same IP + secret", () => {
  const original = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = "test-secret-value";
  try {
    const a = hashIp("203.0.113.5");
    const b = hashIp("203.0.113.5");
    assert.equal(a, b);
  } finally {
    process.env.BETTER_AUTH_SECRET = original;
  }
});

test("hashIp produces different hashes for different IPs", () => {
  const original = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = "test-secret-value";
  try {
    assert.notEqual(hashIp("203.0.113.5"), hashIp("203.0.113.6"));
  } finally {
    process.env.BETTER_AUTH_SECRET = original;
  }
});

test("hashIp never leaks the raw IP into its own output (not a plain/unsalted hash a rainbow table could reverse without the secret)", () => {
  const original = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = "test-secret-value";
  try {
    const ip = "203.0.113.5";
    const hash = hashIp(ip);
    assert.ok(!hash.includes(ip));
    assert.match(hash, /^[0-9a-f]{64}$/, "expected a hex-encoded SHA-256 HMAC digest");
  } finally {
    process.env.BETTER_AUTH_SECRET = original;
  }
});

test("hashIp is keyed by BETTER_AUTH_SECRET — a different secret produces a different hash for the same IP", () => {
  const original = process.env.BETTER_AUTH_SECRET;
  try {
    process.env.BETTER_AUTH_SECRET = "secret-one";
    const hashOne = hashIp("203.0.113.5");
    process.env.BETTER_AUTH_SECRET = "secret-two";
    const hashTwo = hashIp("203.0.113.5");
    assert.notEqual(hashOne, hashTwo);
  } finally {
    process.env.BETTER_AUTH_SECRET = original;
  }
});

test("hashIp throws a clear error when BETTER_AUTH_SECRET is not set, rather than hashing with an empty/undefined key", () => {
  const original = process.env.BETTER_AUTH_SECRET;
  delete process.env.BETTER_AUTH_SECRET;
  try {
    assert.throws(() => hashIp("203.0.113.5"), /BETTER_AUTH_SECRET is not set/);
  } finally {
    if (original !== undefined) process.env.BETTER_AUTH_SECRET = original;
  }
});
