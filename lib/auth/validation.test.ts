// AUTH + ACCOUNT SETTINGS — direct coverage for lib/auth/validation.ts's
// new forgot/reset-password schemas (plain Zod, no next/headers or Better
// Auth dependency, so unlike lib/auth/actions.ts these ARE importable
// directly under this project's node:test runner).
import assert from "node:assert/strict";
import { test } from "node:test";

import { forgotPasswordSchema, loginSchema, resetPasswordSchema, usernameSchema } from "@/lib/auth/validation";

test("usernameSchema accepts Hebrew, English, digits, and mixed Hebrew+digits usernames", () => {
  assert.ok(usernameSchema.safeParse("אבשלום").success);
  assert.ok(usernameSchema.safeParse("אבשלום123").success);
  assert.ok(usernameSchema.safeParse("Avshalom").success);
  assert.ok(usernameSchema.safeParse("Avshalom123").success);
});

test("usernameSchema still rejects spaces and symbols outside the allowed set", () => {
  assert.ok(!usernameSchema.safeParse("bad name!").success);
});

test("loginSchema: an unchecked rememberMe checkbox (FormData.get returns null) resolves to false", () => {
  const parsed = loginSchema.safeParse({ identifier: "trainer1", password: "hunter22", rememberMe: null });
  assert.ok(parsed.success);
  assert.equal(parsed.data.rememberMe, false);
});

test("loginSchema: a checked rememberMe checkbox (\"true\" string, as FormData sends it) resolves to true", () => {
  const parsed = loginSchema.safeParse({ identifier: "trainer1", password: "hunter22", rememberMe: "true" });
  assert.ok(parsed.success);
  assert.equal(parsed.data.rememberMe, true);
});

test("forgotPasswordSchema requires a valid email", () => {
  assert.ok(!forgotPasswordSchema.safeParse({ email: "not-an-email" }).success);
  assert.ok(forgotPasswordSchema.safeParse({ email: "trainer1@example.com" }).success);
});

test("forgotPasswordSchema normalizes email to lowercase, matching Better Auth's own normalization", () => {
  const parsed = forgotPasswordSchema.safeParse({ email: "Trainer1@Example.com" });
  assert.ok(parsed.success);
  assert.equal(parsed.data.email, "trainer1@example.com");
});

test("resetPasswordSchema rejects a missing token", () => {
  const parsed = resetPasswordSchema.safeParse({ token: "", newPassword: "newpassword1", confirmNewPassword: "newpassword1" });
  assert.ok(!parsed.success);
});

test("resetPasswordSchema rejects mismatched new/confirm passwords", () => {
  const parsed = resetPasswordSchema.safeParse({ token: "abc123", newPassword: "newpassword1", confirmNewPassword: "different1" });
  assert.ok(!parsed.success);
});

test("resetPasswordSchema rejects a too-short new password (reuses the shared passwordSchema)", () => {
  const parsed = resetPasswordSchema.safeParse({ token: "abc123", newPassword: "short", confirmNewPassword: "short" });
  assert.ok(!parsed.success);
});

test("resetPasswordSchema accepts a valid token + matching, long-enough passwords", () => {
  const parsed = resetPasswordSchema.safeParse({ token: "abc123", newPassword: "newpassword1", confirmNewPassword: "newpassword1" });
  assert.ok(parsed.success);
});

// PASSWORD RESET EMAIL ACCOUNT MATCH — resetPasswordSchema has NO email
// field at all (only token + newPassword/confirmNewPassword). This is
// structural, not incidental: Better Auth's own resetPassword endpoint
// (node_modules/better-auth/dist/api/routes/password.mjs) resolves the
// account purely from the CONSUMED verification row's own bound userId —
// it never re-reads an email at reset time — so there is no email field
// anywhere in this codebase's reset step that could even be mismatched
// against a different account. See login-form-boundary.test.ts's sibling
// reset-token audit for the full citation.
test("resetPasswordSchema has no email field — an unrelated email can never be submitted at the reset step, let alone used to target a different account", () => {
  const parsed = resetPasswordSchema.safeParse({
    token: "abc123",
    newPassword: "newpassword1",
    confirmNewPassword: "newpassword1",
    email: "someone-else@example.com",
  });
  assert.ok(parsed.success);
  // Zod strips unknown keys by default — even if a caller tried to smuggle
  // an email through, it never reaches auth.api.resetPassword's body.
  assert.ok(!("email" in parsed.data));
});
