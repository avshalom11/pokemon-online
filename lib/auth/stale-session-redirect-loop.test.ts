// AUTH — ERR_TOO_MANY_REDIRECTS regression guard. Root cause: proxy.ts
// (project root) redirects "/" -> "/home" (and any PROTECTED_PATHS route ->
// "/") based purely on session_token COOKIE PRESENCE, never a DB hit (see
// its own doc comment). The real, DB-backed check lives in
// app/(game)/layout.tsx and app/onboarding/starter/page.tsx via
// getCurrentSession(). If a browser's cookie is stale (its Session/User row
// is gone — e.g. the account was deleted on this or another device) those
// two pages correctly see "no session", but redirecting to "/" sent the
// browser right back into proxy.ts's optimistic "cookie present -> /home"
// redirect — an infinite loop, since nothing in that cycle ever cleared the
// cookie. Neither page is importable directly under this project's plain
// node:test runner (both pull in next/navigation's real redirect() and
// next/headers-dependent getCurrentSession()), so — same technique as
// features/account-deletion/account-deletion.ui-wiring.boundary.test.ts —
// this file verifies the fix by reading the real source text.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const gameLayoutSrc = readSourceNormalized("app/(game)/layout.tsx");
const onboardingStarterSrc = readSourceNormalized("app/onboarding/starter/page.tsx");
const clearStaleSessionRouteSrc = readSourceNormalized("app/api/clear-stale-session/route.ts");
const rootPageSrc = readSourceNormalized("app/page.tsx");
const proxySrc = readSourceNormalized("proxy.ts");

test("(game) layout's no-session guard redirects to the cookie-clearing route, never bare '/'", () => {
  assert.match(
    gameLayoutSrc,
    /if \(!session\) \{\s*redirect\("\/api\/clear-stale-session"\);\s*\}/,
    "a stale cookie must be cleared before redirecting, or proxy.ts bounces the browser straight back to /home"
  );
  assert.ok(
    !/if \(!session\) \{\s*redirect\("\/"\);\s*\}/.test(gameLayoutSrc),
    "must not regress to the old bare redirect(\"/\") that caused the loop"
  );
});

test("onboarding starter page's no-session guard redirects to the cookie-clearing route, never bare '/'", () => {
  assert.match(
    onboardingStarterSrc,
    /if \(!session\) \{\s*redirect\("\/api\/clear-stale-session"\);\s*\}/,
    "onboarding/starter is also in proxy.ts's PROTECTED_PATHS, so it has the identical loop risk"
  );
});

test("the root page never redirects on !session (it must not participate in this loop either)", () => {
  assert.ok(
    !/if \(!session\)/.test(rootPageSrc),
    "app/page.tsx must keep rendering AuthScreen directly for no-session — it never redirects for that case"
  );
});

test("the clear-stale-session route reuses Better Auth's real sign-out endpoint and forwards its Set-Cookie headers to a redirect to '/'", () => {
  assert.match(clearStaleSessionRouteSrc, /auth\.api\.signOut\(\{\s*headers:\s*request\.headers,\s*asResponse:\s*true\s*\}\)/);
  assert.match(clearStaleSessionRouteSrc, /NextResponse\.redirect\(new URL\("\/", request\.url\)\)/);
  assert.match(clearStaleSessionRouteSrc, /getSetCookie\(\)/, "must forward every Set-Cookie the sign-out call produces, not just the first");
});

test("(sanity) proxy.ts's redirect is still cookie-presence-only — confirming the mechanism this fix compensates for", () => {
  assert.match(proxySrc, /getSessionCookie\(request\)/);
  assert.match(proxySrc, /pathname === "\/" && sessionCookie/);
});
