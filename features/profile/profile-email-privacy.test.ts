// PROFILE EMAIL PRIVACY — the account's own registered email is shown only
// to the account owner, on their own profile page. Two layers of coverage,
// same split as account-deletion.ui-wiring.boundary.test.ts:
//  1. Runtime: getPublicProfileView's actual return value (owner AND
//     non-owner) never carries an `email` key at all — this is the real
//     server-side guarantee, not merely a UI-hiding convention.
//  2. Source-level: the page/component wiring that supplies the owner's
//     email (app/(game)/profile/[username]/page.tsx -> ProfileContent ->
//     SecurityAccountSection) is next/headers-dependent and not importable
//     directly under this project's plain node:test runner, so its gating
//     is verified by reading the real source text instead.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { getPublicProfileView } from "@/features/profile/services/public-profile-view.service";
import { seedPlayerProfile, resetFakeDb } from "../../test/support/fakes/prisma.fake.ts";

function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1", displayName: "אביב", username: "owner1" });
  seedPlayerProfile({ id: "viewer-1", displayName: "נועה", username: "viewer1" });
});

test("getPublicProfileView never returns an email field — owner viewing their own profile", async () => {
  const view = await getPublicProfileView("owner1", "owner-1");
  assert.ok(view);
  assert.ok(!("email" in view), "PublicProfileView must never carry an email field, even for the owner");
});

test("getPublicProfileView never returns an email field — another authenticated viewer", async () => {
  const view = await getPublicProfileView("owner1", "viewer-1");
  assert.ok(view);
  assert.ok(!("email" in view), "a non-owner viewer's response must never carry an email field");
});

test("getPublicProfileView never returns an email field — anonymous/no-session viewer", async () => {
  const view = await getPublicProfileView("owner1", null);
  assert.ok(view);
  assert.ok(!("email" in view), "an anonymous viewer's response must never carry an email field");
});

test("(source) getPublicProfileView's own User select never requests email", () => {
  const src = readSourceNormalized("features/profile/services/public-profile-view.service.ts");
  const selectMatch = src.match(/prisma\.user\.findUnique\(\{[\s\S]*?select:\s*\{([\s\S]*?)\}/);
  assert.ok(selectMatch, "expected to find the User select clause");
  assert.ok(!/\bemail\b/.test(selectMatch[1]), "the public profile query must never select email off User");
});

test("(source) the profile page resolves ownerEmail from the session, gated on view.isOwner, never from getPublicProfileView", () => {
  const src = readSourceNormalized("app/(game)/profile/[username]/page.tsx");
  assert.match(
    src,
    /const ownerEmail = view\.isOwner \? session\.user\.email : null;/,
    "ownerEmail must be read from the authenticated session and gated on view.isOwner"
  );
  assert.match(src, /ownerEmail=\{ownerEmail\}/, "ownerEmail must be threaded into ProfileContent");
});

test("(source) ProfileContent only ever renders SecurityAccountSection (and its ownerEmail prop) for the owner", () => {
  const src = readSourceNormalized("features/profile/components/ProfileContent.tsx");
  assert.match(
    src,
    /view\.isOwner && ownerEmail !== null \? \(\s*<SecurityAccountSection[\s\S]*?ownerEmail=\{ownerEmail\}/,
    "SecurityAccountSection must only mount, with ownerEmail, when view.isOwner is true"
  );
});

test("(source) SecurityAccountSection displays the email label from its ownerEmail prop", () => {
  const src = readSourceNormalized("features/profile/components/SecurityAccountSection.tsx");
  assert.match(src, /אימייל:/, "the email label must be rendered");
  assert.match(src, /\{ownerEmail\}/, "the displayed value must come from the ownerEmail prop, not a hardcoded/derived value");
});
