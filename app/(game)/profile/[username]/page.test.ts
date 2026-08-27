// PROFILE — HEBREW USERNAME 404 REGRESSION GUARD. Root cause: in this
// installed Next.js version, a PAGE component's dynamic route `params`
// arrive as the RAW, still percent-encoded URL segment (verified directly:
// a Hebrew username's segment showed up here as the literal string
// "%D7%90%D7%91..." with ASCII '%'/digit codepoints, never the real
// "אבשלום") — unlike Route Handlers, whose `params` ARE already decoded
// for the exact same URL. getPublicProfileView's own username lookup was
// never the problem (confirmed working for the decoded string, directly
// and via a Route Handler); the only bug was this page never decoding the
// segment before passing it on. This file is not importable directly
// under this project's plain node:test runner (next/navigation's real
// redirect() + next/headers-dependent getCurrentSession()), so — same
// technique as the other next/headers-dependent boundary tests in this
// codebase — this verifies the fix by reading the real source text.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const pageSrc = readSourceNormalized("app/(game)/profile/[username]/page.tsx");

test("the profile page decodes the raw dynamic segment before using it as a username", () => {
  assert.match(
    pageSrc,
    /const \{ username: rawUsername \} = await params;/,
    "must read the raw segment under its own name, not shadow it as the already-usable username"
  );
  assert.match(
    pageSrc,
    /decodeURIComponent\(rawUsername\)/,
    "must decode the raw segment — this Next.js version does not auto-decode page params"
  );
});

test("a malformed percent-encoding falls back to the raw value instead of crashing the page", () => {
  assert.match(
    pageSrc,
    /try \{\s*username = decodeURIComponent\(rawUsername\);\s*\} catch \{/,
    "decodeURIComponent throws on a malformed sequence — must degrade to the existing 'not found' UI, not a 500"
  );
});

test("getPublicProfileView is called with the decoded username, not the raw segment", () => {
  assert.match(pageSrc, /getPublicProfileView\(username, session\.user\.id\)/);
  assert.ok(
    !/getPublicProfileView\(rawUsername/.test(pageSrc),
    "must never pass the still-encoded raw segment into the shared lookup"
  );
});
