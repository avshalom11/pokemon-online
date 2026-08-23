import "server-only";

import { createHmac } from "node:crypto";

import { getIp } from "@better-auth/core/utils/ip";

// AUTH SECURITY — REQUEST IP RESOLUTION. One shared helper for resolving
// "which requester is this" for rate limiting — reuses Better Auth's own
// installed IP-resolution utility (@better-auth/core/utils/ip) rather than
// hand-rolling header parsing: this project's own Better Auth instance
// already trusts this exact code path for Session.ipAddress (see the
// installed better-auth's db/internal-adapter.mjs createSession, which
// calls this same getIp), so reusing it here extends an ALREADY-accepted
// trust boundary rather than introducing a second, possibly-inconsistent
// one.
//
// Deliberately takes a plain `Headers` object as a parameter rather than
// calling next/headers' `headers()` itself — keeps this module framework-
// agnostic (no next/headers import at all), so unlike lib/auth/actions.ts
// this file is directly importable/testable under this project's plain
// node:test runner. Callers pass `await headers()` from a Server Action.
//
// KNOWN LIMITATION: `x-forwarded-for`/`x-real-ip` are only trustworthy
// insofar as SOME reverse proxy in front of this app actually sets them
// itself and strips/overwrites whatever a client tried to send — a raw
// client talking directly to this server (true of local dev, and of any
// production deployment not yet confirmed to sit behind such a proxy) can
// set these headers itself and spoof an arbitrary source. This is an
// inherent limitation of IP-from-headers resolution, not something this
// helper can close without knowing the real deployment topology. Once a
// production reverse proxy's IP range is known, set TRUSTED_PROXY_CIDRS
// (comma-separated CIDRs, e.g. "10.0.0.0/8") so getIp only trusts the hop
// added by that proxy — see getIp's own trustedProxies handling
// (node_modules/@better-auth/core/src/utils/ip.ts): without it, a
// single-value header is trusted as-is (the common single-proxy case,
// but also exactly what an unproxied direct client could forge), and a
// multi-value chain is refused outright (fails closed) rather than
// guessed at.
const TRUSTED_IP_HEADERS = ["x-forwarded-for", "x-real-ip"];

function getTrustedProxyCidrs(): string[] {
  const raw = process.env.TRUSTED_PROXY_CIDRS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

// Falls back to "unknown" (a single shared bucket) only in the — expected
// to be rare in practice — case where no configured header yields a
// resolvable IP at all; getIp's own dev/test fallback already returns
// "127.0.0.1" in development, so this only bites in an unusual production
// proxy setup. A shared bucket still rate-limits those requests (fails
// toward "still protected", never "silently unlimited") rather than
// skipping the limiter entirely for an unresolvable source.
const UNKNOWN_IP_BUCKET = "unknown";

export function resolveRequestIp(requestHeaders: Headers): string {
  const ip = getIp(requestHeaders, {
    advanced: {
      ipAddress: {
        ipAddressHeaders: TRUSTED_IP_HEADERS,
        trustedProxies: getTrustedProxyCidrs(),
      },
    },
  } as Parameters<typeof getIp>[1]);

  return ip ?? UNKNOWN_IP_BUCKET;
}

// Keyed HMAC, never a raw or plain hash of the IP — see this file's own
// module doc comment / LoginAttemptLock's schema comment for why a plain
// hash would be practically reversible (the IPv4 space is brute-forceable)
// while a secret-keyed one isn't, without ever storing the IP itself.
export function hashIp(ip: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not set — required to hash request IPs for rate limiting.");
  }
  return createHmac("sha256", secret).update(ip).digest("hex");
}
