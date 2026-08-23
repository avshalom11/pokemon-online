import "server-only";

import { createHmac, randomBytes } from "node:crypto";

// ACCOUNT DELETION — token generation/hashing. Same keyed-HMAC posture as
// request-ip.ts's hashIp (never a raw/plain hash): the token itself is high
// entropy (32 random bytes, 256 bits), so an unkeyed hash would already be
// safe against brute force, but hashing it with a secret this app alone
// holds means even a full DB dump plus a hypothetical future weakening of
// the token's own randomness still can't be turned into a valid deletion
// link. The raw token only ever exists in the emailed URL and this
// request's own memory — never persisted.
//
// A fixed namespace prefix keeps this HMAC's input space disjoint from
// hashIp's (both key off the same BETTER_AUTH_SECRET) — not a cryptographic
// requirement here (the inputs are already different strings), but it keeps
// the two purposes from ever being confusable if either function's callers
// change later.
const HMAC_NAMESPACE = "account-deletion-token:";

export function generateDeletionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashDeletionToken(rawToken: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not set — required to hash account-deletion tokens.");
  }
  return createHmac("sha256", secret).update(HMAC_NAMESPACE + rawToken).digest("hex");
}
