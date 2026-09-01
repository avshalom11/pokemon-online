// STAFF / MODERATION — PHASE 6 — the pure OWNER-only access decision
// (isStaffAdminRole) plus a source-level check that both admin pages
// actually gate on it and redirect a non-OWNER away — same technique
// lib/auth/site-ban-redirect-loop.test.ts already establishes for a page
// that can't be executed directly under this project's plain node:test
// runner (next/headers/next/navigation dependencies).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { isStaffAdminRole } from "@/features/moderation/services/staff-admin-access";

// 1 — OWNER is allowed
test("1: OWNER is allowed onto the staff-admin/moderation-history surfaces", () => {
  assert.equal(isStaffAdminRole("OWNER"), true);
});

// 2 — DEPUTY/SUPPORT/plain player are all rejected (OWNER-only for now)
test("2: DEPUTY, SUPPORT, and a plain player (null) are all rejected", () => {
  assert.equal(isStaffAdminRole("DEPUTY"), false);
  assert.equal(isStaffAdminRole("SUPPORT"), false);
  assert.equal(isStaffAdminRole(null), false);
});

// 3 — (source) both admin pages redirect a non-OWNER away
function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const staffPageSrc = readSourceNormalized("app/(game)/admin/staff/page.tsx");
const historyPageSrc = readSourceNormalized("app/(game)/admin/moderation-history/page.tsx");

test("3: (source) the staff-admin page checks isStaffAdminRole and redirects to /home when false", () => {
  assert.match(staffPageSrc, /isStaffAdminRole\(role\)/);
  assert.match(staffPageSrc, /redirect\("\/home"\)/);
});

test("4: (source) the moderation-history page checks isStaffAdminRole and redirects to /home when false", () => {
  assert.match(historyPageSrc, /isStaffAdminRole\(role\)/);
  assert.match(historyPageSrc, /redirect\("\/home"\)/);
});

test("5: (source) neither admin page assumes a non-null session without a defensive re-check", () => {
  for (const src of [staffPageSrc, historyPageSrc]) {
    assert.match(src, /if \(!session\) \{\s*redirect\("\/api\/clear-stale-session"\);\s*\}/);
  }
});
