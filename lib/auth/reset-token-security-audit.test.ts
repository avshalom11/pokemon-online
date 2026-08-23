// PASSWORD RESET EMAIL ACCOUNT MATCH / RESET TOKEN SECURITY — audit
// coverage. This codebase never implements its own token/email-matching
// logic (see lib/auth/actions.ts's requestPasswordResetAction/
// resetPasswordAction, both thin wrappers) — the actual account-binding
// guarantee lives entirely inside Better Auth's own installed source. This
// file (a) proves our wrapper code never adds a second matching path of
// its own, and (b) pins down, by citing the exact installed source, why
// the guarantee holds:
//
//   node_modules/better-auth/dist/api/routes/password.mjs:
//   - requestPasswordReset resolves the account via EXACTLY ONE call,
//     `internalAdapter.findUserByEmail(email)` — the submitted email,
//     no fuzzy/partial matching. The verification row it creates is
//     `{ value: user.user.id, identifier: "reset-password:<token>" }` —
//     the token is bound to that resolved user's id at creation time.
//   - resetPassword's request body is `{ newPassword, token }` — it has
//     NO email field at all. The account is resolved purely by
//     `internalAdapter.consumeVerificationValue("reset-password:" + token)`
//     → `verification.value` (the userId bound above). A token minted for
//     account X can therefore never touch account Y's password, no matter
//     what email (if any) accompanies the reset request — there is
//     nothing for a mismatched email to even confuse, since none is read.
//   - `consumeVerificationValue` deletes the row on read (single-use);
//     `resetPasswordTokenExpiresIn` bounds its lifetime (expiring); a
//     nonexistent email short-circuits with a dummy token
//     generation + lookup and the SAME response shape as a real one
//     (account-enumeration protection, built in, unmodified by us).
//
// If a future change to lib/auth/auth.ts or actions.ts ever introduces a
// custom email-based lookup in the reset flow, these tests should be
// revisited — that would be exactly the kind of change that could
// reintroduce a cross-account reset bug.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const actionsSrc = fs.readFileSync("lib/auth/actions.ts", "utf8");
const authSrc = fs.readFileSync("lib/auth/auth.ts", "utf8");
const betterAuthPasswordRoutesSrc = fs.readFileSync(
  "node_modules/better-auth/dist/api/routes/password.mjs",
  "utf8"
);

test("requestPasswordResetAction forwards the submitted email as-is to Better Auth's own endpoint — no custom lookup/matching of our own", () => {
  const fnSrc = actionsSrc.slice(
    actionsSrc.indexOf("export async function requestPasswordResetAction"),
    actionsSrc.indexOf("export async function resetPasswordAction")
  );
  assert.ok(fnSrc.includes("auth.api.requestPasswordReset("));
  assert.ok(fnSrc.includes("email: parsed.data.email"));
  // No direct Prisma/User table access in this action — the only account
  // resolution happens inside auth.api.requestPasswordReset itself.
  assert.ok(!fnSrc.includes("prisma.user"));
});

test("resetPasswordAction never accepts or forwards an email — only token + newPassword, matching resetPasswordSchema's own shape (see validation.test.ts)", () => {
  const fnSrc = actionsSrc.slice(actionsSrc.indexOf("export async function resetPasswordAction"));
  assert.ok(fnSrc.includes("auth.api.resetPassword("));
  assert.ok(fnSrc.includes("newPassword: parsed.data.newPassword, token: parsed.data.token"));
  assert.ok(!/email/i.test(fnSrc.slice(0, fnSrc.indexOf("export async function logoutAction"))));
});

test("auth.ts never overrides Better Auth's own account-resolution — no custom sendResetPassword logic re-derives which user the token belongs to", () => {
  const emailAndPasswordBlock = authSrc.slice(
    authSrc.indexOf("emailAndPassword: {"),
    authSrc.indexOf("session: {")
  );
  // The only thing our sendResetPassword callback does is deliver the
  // already-resolved `user`/`url` Better Auth hands it — it never queries
  // for a user itself.
  assert.ok(emailAndPasswordBlock.includes("sendResetPassword: async ({ user, url }) => {"));
  assert.ok(!emailAndPasswordBlock.includes("prisma.user.findUnique"));
  assert.ok(!emailAndPasswordBlock.includes("findUserByEmail"));
});

test("(citation check) the installed Better Auth binds the reset token to the resolved user id at creation time, via findUserByEmail + a verification row keyed by that same id", () => {
  assert.ok(betterAuthPasswordRoutesSrc.includes("internalAdapter.findUserByEmail(email"));
  assert.ok(betterAuthPasswordRoutesSrc.includes("value: user.user.id"));
  assert.ok(betterAuthPasswordRoutesSrc.includes('identifier: `reset-password:${verificationToken}`'));
});

test("(citation check) the installed Better Auth's resetPassword body has no email field — the account is resolved purely from the consumed token's own bound userId", () => {
  const resetPasswordEndpointSrc = betterAuthPasswordRoutesSrc.slice(
    betterAuthPasswordRoutesSrc.indexOf('const resetPassword = createAuthEndpoint("/reset-password"'),
    betterAuthPasswordRoutesSrc.indexOf("const verifyPassword")
  );
  const bodySchemaSrc = resetPasswordEndpointSrc.slice(
    resetPasswordEndpointSrc.indexOf("body: z.object({"),
    resetPasswordEndpointSrc.indexOf("}),")
  );
  assert.ok(bodySchemaSrc.includes("newPassword"));
  assert.ok(!/email/i.test(bodySchemaSrc), "the request body schema must never declare an email field");
  assert.ok(!resetPasswordEndpointSrc.includes("ctx.body.email"), "the handler must never read an email off the request body");
  assert.ok(resetPasswordEndpointSrc.includes("internalAdapter.consumeVerificationValue(id)"));
  assert.ok(resetPasswordEndpointSrc.includes("const userId = verification.value"));
});

test("(citation check) an unknown email gets the identical generic response as a real one, after a dummy token generation/lookup — built-in account-enumeration protection", () => {
  const requestEndpointSrc = betterAuthPasswordRoutesSrc.slice(
    betterAuthPasswordRoutesSrc.indexOf('const requestPasswordReset = createAuthEndpoint("/request-password-reset"'),
    betterAuthPasswordRoutesSrc.indexOf("const requestPasswordResetCallback")
  );
  assert.ok(requestEndpointSrc.includes("if (!user) {"));
  assert.ok(requestEndpointSrc.includes("generateId(24)"), "a dummy token must still be generated for the timing-attack mitigation");
  assert.ok(requestEndpointSrc.includes('findVerificationValue("dummy-verification-token")'));

  // Only the two `ctx.json({ status: true, message: "..." })` responses —
  // the unknown-email branch and the real (email-found) branch — must
  // match; the unrelated early "Reset password isn't enabled" config-error
  // message (a misconfiguration, not an email-existence signal) is
  // intentionally excluded from this comparison.
  const afterGuardClause = requestEndpointSrc.slice(requestEndpointSrc.indexOf("const { email, redirectTo } = ctx.body;"));
  const responseTexts = [...afterGuardClause.matchAll(/message:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(responseTexts.length, 2, "expected exactly the unknown-email and real-email response messages");
  assert.equal(new Set(responseTexts).size, 1, "the unknown-email branch and the real branch must return the exact same message text");
});

test("(citation check) the reset token is consumed (deleted) exactly once and its lifetime is bounded by resetPasswordTokenExpiresIn", () => {
  assert.ok(betterAuthPasswordRoutesSrc.includes("consumeVerificationValue"));
  assert.ok(betterAuthPasswordRoutesSrc.includes("resetPasswordTokenExpiresIn"));
  assert.ok(authSrc.includes("resetPasswordTokenExpiresIn: RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS"));
});
