// STAFF / MODERATION — PHASE 4 — SITE BAN REDIRECT-LOOP GUARD. Same
// technique as lib/auth/stale-session-redirect-loop.test.ts (whose own
// doc comment explains why): auth-session.ts pulls in next/headers and
// next/navigation's real redirect(), and app/banned/page.tsx pulls in
// next/headers too — neither is importable/executable under this
// project's plain node:test runner. This file verifies the redirect-loop
// fix by reading the real source text instead.
//
// Every check below targets actual USAGE syntax (an import line, a
// call with parens, a dotted property access) rather than a blanket
// substring ban — this file's own doc comments (and the files under
// test) legitimately name these same identifiers in prose, which a
// plain substring check would misfire on (same precedent
// features/chat/global-chat.test.ts's own test 14 already establishes).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

// Strips `//` line comments before an includes()-based usage check — this
// project's own doc comments freely name identifiers/call syntax in
// prose (as this very file's do), which a raw substring check can't tell
// apart from real code. The regex-based assert.match checks below target
// real code directly and don't need this.
function stripLineComments(source: string): string {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

const authSessionSrc = readSourceNormalized("lib/auth/auth-session.ts");
const bannedPageSrc = readSourceNormalized("app/banned/page.tsx");
const bannedPageCode = stripLineComments(bannedPageSrc);
const actionsSrc = readSourceNormalized("lib/auth/actions.ts");
const actionsCode = stripLineComments(actionsSrc);
const siteAccessSrc = readSourceNormalized("features/moderation/services/site-access.service.ts");
const siteAccessCode = stripLineComments(siteAccessSrc);

test("getCurrentSession redirects to /banned via resolveSiteBanRedirectPath, never a bare inline check", () => {
  assert.match(authSessionSrc, /resolveSiteBanRedirectPath\(profileId\)/);
  assert.match(authSessionSrc, /if \(redirectPath\) \{\s*redirect\(redirectPath\);\s*\}/);
});

test("app/banned/page.tsx never imports or calls getCurrentSession — the only function that ever redirects here", () => {
  assert.ok(
    !bannedPageCode.includes("getCurrentSession("),
    "the banned page must resolve its own session independently (a raw auth.api.getSession call), or a site-banned visitor would be redirected back to /banned by getCurrentSession itself — an infinite loop"
  );
  assert.ok(
    !bannedPageCode.includes('from "@/lib/auth/auth-session"'),
    "must not even import from the module that owns the redirecting getCurrentSession"
  );
  assert.match(bannedPageSrc, /auth\.api\.getSession\(/, "must resolve its session via the raw Better Auth API directly");
});

test("app/banned/page.tsx falls back to /home when the visitor is not actually banned (a lifted ban, or a direct visit)", () => {
  assert.match(bannedPageSrc, /if \(!banInfo\) redirect\("\/home"\);/);
});

test("app/banned/page.tsx never exposes staff identity, internal ids, or audit metadata — only { type, expiresAt }", () => {
  for (const forbiddenAccess of ["banInfo.reason", "banInfo.actorPlayerId", ".revokedBy", ".targetResourceId", "action.id"]) {
    assert.ok(!bannedPageCode.includes(forbiddenAccess), `must never reference ${forbiddenAccess}`);
  }
});

// STAFF / MODERATION — PHASE 7 — getCurrentSessionFast() now ALSO
// redirects to /banned (the security-review fix — see auth-session.ts's
// own doc comment on that function for the full reasoning: several real
// battle-action Server Actions used it and never re-checked ban status at
// all). That means logoutAction can no longer safely use EITHER wrapper —
// both now carry the "would hijack sign-out" redirect problem — so it
// must call the raw Better Auth API directly instead (the same call
// app/banned/page.tsx and app/api/clear-stale-session/route.ts already
// use).
test("getCurrentSessionFast also redirects to /banned via resolveSiteBanRedirectPath — the Phase 7 security fix", () => {
  const fastBody = authSessionSrc.slice(authSessionSrc.indexOf("export const getCurrentSessionFast"));
  assert.match(fastBody, /resolveSiteBanRedirectPath\(profile\.id\)/);
  assert.match(fastBody, /if \(redirectPath\) \{\s*redirect\(redirectPath\);\s*\}/);
});

test("logoutAction calls the raw Better Auth API directly, never getCurrentSession or getCurrentSessionFast — or a banned user could never sign out", () => {
  const logoutBody = actionsCode.slice(actionsCode.indexOf("export async function logoutAction"));
  assert.match(logoutBody, /auth\.api\.getSession\(/, "must resolve its session via the raw Better Auth API directly, with no redirect side effect");
  assert.ok(
    !logoutBody.includes("getCurrentSession()") && !logoutBody.includes("getCurrentSessionFast()"),
    "logoutAction must never call either session wrapper — both now redirect a site-banned caller, which would prevent signing out"
  );
});

test("(sanity) resolveSiteBanRedirectPath itself has no next/headers or next/navigation import, confirming it's the safe, testable seam", () => {
  assert.ok(!siteAccessCode.includes('from "next/headers"'));
  assert.ok(!siteAccessCode.includes('from "next/navigation"'));
});
