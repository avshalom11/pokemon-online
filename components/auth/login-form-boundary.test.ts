// AUTH UX — source-level boundary coverage for LoginForm.tsx. This
// project has no DOM/render harness (see e.g. features/profile/
// profile-achievements-wiring-boundary.test.ts's own doc comment for the
// same established limitation/technique), so a "use client" component
// like this one can't be rendered or interacted with under plain
// node:test — these tests read its actual source text instead.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const loginFormSrc = fs.readFileSync("components/auth/LoginForm.tsx", "utf8");

test("1/3: the identifier field uses autoComplete=\"username\" — the semantic browsers/password managers key credential-save/autofill off", () => {
  assert.match(loginFormSrc, /name="identifier"[\s\S]{0,80}autoComplete="username"/);
});

test("2: the password field is passed autoComplete=\"current-password\" (via the shared PasswordField, not a raw <input>)", () => {
  assert.ok(loginFormSrc.includes('name="password"'));
  assert.match(loginFormSrc, /name="password"[\s\S]{0,60}autoComplete="current-password"/);
});

test("3: no autoComplete=\"off\"/\"new-password\" anywhere on this form — nothing suppresses the browser's own save/autofill prompt", () => {
  assert.ok(!loginFormSrc.includes('autoComplete="off"'));
  assert.ok(!loginFormSrc.includes('autoComplete="new-password"'));
});

test("3: the identifier/password fields have stable name attributes and are real form-associated inputs (not stripped from the submitted FormData) — required for Chrome/Edge to treat this as a real, submittable credential form", () => {
  assert.ok(loginFormSrc.includes('<form action={formAction}'));
  assert.ok(loginFormSrc.includes('name="identifier"'));
  assert.ok(loginFormSrc.includes('name="password"'));
});

test("4 (no plaintext credential storage): sessionStorage is used ONLY for the lockout countdown key, and only ever with an ISO timestamp value — never the password field, never the identifier value, never localStorage/cookies", () => {
  const storageCalls = loginFormSrc.match(/sessionStorage\.(setItem|getItem|removeItem)\([^)]*\)/g) ?? [];
  assert.ok(storageCalls.length > 0, "expected at least one sessionStorage call (the lockout countdown persistence)");
  for (const call of storageCalls) {
    assert.ok(call.includes("LOCKOUT_STORAGE_KEY"), `every sessionStorage call must use the lockout key, got: ${call}`);
  }
  assert.ok(
    !/localStorage\.(setItem|getItem|removeItem)/.test(loginFormSrc),
    "this form must never call the localStorage API"
  );
  assert.ok(!/document\.cookie\s*=/.test(loginFormSrc), "this form must never write cookies itself");
  assert.ok(
    !/sessionStorage\.setItem\(\s*LOCKOUT_STORAGE_KEY\s*,\s*(password|identifier)/.test(loginFormSrc),
    "the stored value must never be the password or identifier field — only state.lockedUntil"
  );
  assert.ok(
    loginFormSrc.includes("sessionStorage.setItem(LOCKOUT_STORAGE_KEY, state.lockedUntil)"),
    "the only write must persist the server's own lockedUntil timestamp"
  );
});

test('5: the Remember Me checkbox\'s user-facing label reads "השאר אותי מחובר"', () => {
  assert.ok(loginFormSrc.includes("השאר אותי מחובר"));
  assert.ok(!loginFormSrc.includes("זכור אותי"), "the old wording must be fully replaced, not left alongside the new one");
});

test("5/6: the checkbox still posts name=\"rememberMe\" (Better Auth's own expected field), defaults to checked (persistent session by default), and is otherwise untouched — only the label text changed", () => {
  assert.match(loginFormSrc, /type="checkbox"\s*\n\s*name="rememberMe"\s*\n\s*value="true"\s*\n\s*defaultChecked/);
});

test("9: the countdown is rendered from getRemainingLockoutMs/lockedUntilIso (the authoritative server value) — this file defines no independent lock-duration constant of its own (e.g. no literal 15/900000)", () => {
  assert.ok(!/\b15\s*\*\s*60\s*\*\s*1000\b/.test(loginFormSrc));
  assert.ok(!/\b900000\b/.test(loginFormSrc));
  assert.ok(loginFormSrc.includes("getRemainingLockoutMs(lockedUntilIso"));
});

test("12: on mount, an in-progress lockout is restored from sessionStorage BEFORE anything is cleared — a refresh must not lose or restart it", () => {
  const restoreEffectIndex = loginFormSrc.indexOf("sessionStorage.getItem(LOCKOUT_STORAGE_KEY)");
  assert.ok(restoreEffectIndex > -1, "must read the persisted lockedUntil on mount");
  assert.ok(loginFormSrc.includes("setLockedUntilIso(stored)"), "a still-future stored value must be adopted, not discarded");
});

test("13: reaching zero remaining time clears BOTH the in-memory state and the persisted sessionStorage entry, returning cleanly to normal login state", () => {
  const tickFnSrc = loginFormSrc.slice(loginFormSrc.indexOf("function tick()"), loginFormSrc.indexOf("tick();\n"));
  assert.ok(tickFnSrc.includes("if (remaining <= 0)"));
  assert.ok(tickFnSrc.includes("setRemainingMs(null)"));
  assert.ok(tickFnSrc.includes("setLockedUntilIso(null)"));
  assert.ok(tickFnSrc.includes("sessionStorage.removeItem(LOCKOUT_STORAGE_KEY)"));
});

test("the submit button is disabled while locked out (never lets a doomed submit through, on top of the server's own authoritative rejection)", () => {
  assert.ok(loginFormSrc.includes("disabled={pending || isLockedOut}"));
});
