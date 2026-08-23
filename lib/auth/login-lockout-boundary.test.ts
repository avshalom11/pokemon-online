// AUTH + ACCOUNT SETTINGS — source-level boundary coverage for the pieces
// this project's test harness genuinely cannot exercise directly:
// lib/auth/actions.ts and lib/auth/auth.ts both transitively pull in
// next/headers and the real Better Auth instance (auth.api.*), which this
// repo's plain node:test runner cannot resolve outside a real Next.js
// server context — same established limitation (and same "read the actual
// source text" technique) as e.g. features/profile/services/
// update-profile-achievements-visibility.test.ts's own doc comment
// documents for update-profile.service.ts. login-lockout.ts itself IS
// directly tested for real, behaviorally — see login-lockout.test.ts.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const actionsSrc = fs.readFileSync("lib/auth/actions.ts", "utf8");
const authSrc = fs.readFileSync("lib/auth/auth.ts", "utf8");
const changePasswordServiceSrc = fs.readFileSync("features/profile/services/change-password.service.ts", "utf8");

test("loginAction resolves identifierKey/ipHash and checks lockout BEFORE attempting sign-in, and never authenticates a locked (identifier, IP) pair", () => {
  const ipHashIndex = actionsSrc.indexOf("const ipHash = hashIp(resolveRequestIp(requestHeaders));");
  const lockCheckIndex = actionsSrc.indexOf("await isLockedOut(identifierKey, ipHash)");
  // The real call site (`auth.api.signInEmail({`), not the earlier doc
  // comment mentioning "auth.api.signInEmail/" by name a few lines above.
  const signInIndex = actionsSrc.indexOf("auth.api.signInEmail({");
  assert.ok(ipHashIndex > -1 && lockCheckIndex > -1 && signInIndex > -1);
  assert.ok(ipHashIndex < lockCheckIndex, "the IP must be resolved before the lockout check that needs it");
  assert.ok(lockCheckIndex < signInIndex, "the lockout check must run before any sign-in attempt");
});

test("loginAction records a failed attempt for EVERY identifier (including ones with no matching account) — never gated on account existence", () => {
  // Unlike the old design, there is no findLockableUserByIdentifier/
  // "if (lockableUser)" guard anymore — recordFailedLoginAttempt is called
  // unconditionally on every failed sign-in, keyed by the raw normalized
  // identifier + IP hash, not an account id.
  assert.ok(!actionsSrc.includes("findLockableUserByIdentifier"), "the old account-existence gate must be fully removed");
  assert.ok(
    actionsSrc.includes(
      "const { justLockedOut, lockedUntil, failedAttempts } = await recordFailedLoginAttempt(identifierKey, ipHash);"
    )
  );
});

test("loginAction resets the failure counter (for this identifier+IP pair specifically) after a successful sign-in", () => {
  assert.ok(actionsSrc.includes("await resetLoginAttempts(identifierKey, ipHash);"));
});

test("loginAction returns locked:true + message:LOGIN_LOCKED_MESSAGE on both the pre-check and the just-crossed-threshold path", () => {
  const preCheckIndex = actionsSrc.indexOf(
    'message: LOGIN_LOCKED_MESSAGE,\n      locked: true,\n      lockedUntil: preCheck.lockedUntil!.toISOString(),'
  );
  const justLockedIndex = actionsSrc.indexOf(
    'status: "error",\n        message: LOGIN_LOCKED_MESSAGE,\n        locked: true,\n        lockedUntil: lockedUntil!.toISOString(),'
  );
  assert.ok(preCheckIndex > -1, "the pre-check short-circuit must use this exact shape");
  assert.ok(justLockedIndex > -1, "the just-locked-out response (inside the catch block) must use this exact shape");
});

// LOCKOUT COUNTDOWN — the client only ever gets an authoritative timestamp
// derived from the DB's own lockedUntil, never a value the server itself
// invents/recomputes independently of what recordFailedLoginAttempt /
// isLockedOut already established.
test("loginAction always sends lockedUntil as an ISO string derived from the real lockedUntil Date, never a fresh/independent value", () => {
  assert.ok(
    actionsSrc.includes("lockedUntil: preCheck.lockedUntil!.toISOString(),"),
    "the pre-check path must forward isLockedOut's own resolved lockedUntil"
  );
  assert.ok(
    actionsSrc.includes("lockedUntil: lockedUntil!.toISOString(),"),
    "the just-locked-out path must forward recordFailedLoginAttempt's own returned lockedUntil"
  );
});

test("loginAction never trusts a client-supplied IP — resolveRequestIp is only ever called with the server-resolved request headers, and no `ip` form field is ever read", () => {
  assert.ok(actionsSrc.includes("resolveRequestIp(requestHeaders)"));
  assert.ok(!actionsSrc.includes('formData.get("ip")'), 'loginAction must never read an "ip" field from client-submitted form data');
});

test("loginAction applies a non-blocking progressive delay uniformly for every failed attempt, regardless of whether the identifier resolves to a real account", () => {
  const delayIndex = actionsSrc.indexOf("const delayMs = getProgressiveDelayMs(failedAttempts);");
  const setTimeoutIndex = actionsSrc.indexOf('await new Promise((resolve) => setTimeout(resolve, delayMs));');
  assert.ok(delayIndex > -1 && setTimeoutIndex > -1);
  assert.ok(delayIndex < setTimeoutIndex);
});

test("loginAction notifies the account owner exactly on the just-locked-out transition, never on the pre-check short-circuit (which never even attempts sign-in / records a failure)", () => {
  const catchBlockSrc = actionsSrc.slice(actionsSrc.indexOf("} catch {"), actionsSrc.indexOf("await resetLoginAttempts"));
  assert.ok(catchBlockSrc.includes("if (justLockedOut) {"));
  assert.ok(catchBlockSrc.includes("await notifySecurityLoginLockout(identifierKey, isEmailIdentifier);"));
  const preCheckSrc = actionsSrc.slice(actionsSrc.indexOf("const preCheck ="), actionsSrc.indexOf("try {\n    if (isEmailIdentifier)"));
  assert.ok(!preCheckSrc.includes("notifySecurityLoginLockout"), "the pre-check (already-locked) short-circuit must never re-notify");
});

test("requestPasswordResetAction always returns the same generic success message, even when the underlying call throws", () => {
  const fnSrc = actionsSrc.slice(actionsSrc.indexOf("export async function requestPasswordResetAction"), actionsSrc.indexOf("export async function resetPasswordAction"));
  assert.match(fnSrc, /catch\s*{\s*\/\/[\s\S]*?}/, "failures must be swallowed, never surfaced with a different message");
  const returnCount = (fnSrc.match(/status: "success"/g) ?? []).length;
  assert.equal(returnCount, 1, "there must be exactly one success return, reached regardless of whether the try block succeeded");
});

test("resetPasswordAction never logs or returns the submitted password, and always delegates to Better Auth's own resetPassword", () => {
  const fnSrc = actionsSrc.slice(actionsSrc.indexOf("export async function resetPasswordAction"));
  assert.ok(fnSrc.includes("auth.api.resetPassword("));
  assert.ok(!fnSrc.includes("console.log") && !fnSrc.includes("console.error"), "the new password must never be logged");
});

test("auth.ts wires sendResetPassword to the isolated email module, never inlines provider/template logic", () => {
  assert.ok(authSrc.includes('import { sendPasswordResetEmail } from "@/lib/email/password-reset-email";'));
  assert.ok(authSrc.includes("sendResetPassword: async ({ user, url }) => {"));
  assert.ok(authSrc.includes("await sendPasswordResetEmail(user.email, url);"));
  assert.ok(!authSrc.includes("new Resend("), "auth.ts must never talk to the Resend SDK directly — only through lib/email");
});

test("auth.ts sets a bounded reset-token expiry and revokes sessions on a completed reset", () => {
  assert.ok(authSrc.includes("resetPasswordTokenExpiresIn: RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS"));
  assert.ok(authSrc.includes("revokeSessionsOnPasswordReset: true"));
});

test("change-password.service.ts revokes OTHER sessions (not the current one) on a successful password change", () => {
  assert.ok(changePasswordServiceSrc.includes("revokeOtherSessions: true"));
});
