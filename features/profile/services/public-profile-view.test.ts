// PUBLIC PROFILE + FRIEND STATUS — focused coverage. This function
// (getPublicProfileView) was previously UNTESTABLE under the fake DB — no
// fake `user.findUnique` existed — which is exactly the class of gap that
// let the real profile crash (a stale-Prisma-Client `prisma.friendship` —
// see this task's own report for the full root-cause writeup) go
// unnoticed by the test suite. This file is the new coverage that gap
// enables: both the owner and non-owner branches, run end to end against
// the real getPublicProfileView + getFriendsAndRequests, is now the
// automated regression guard for "opening a profile does not crash."
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { getPublicProfileView } from "@/features/profile/services/public-profile-view.service";
import { seedFriendship, seedPlayerProfile, seedStaffMember, resetFakeDb } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1", displayName: "אביב", username: "owner1" });
  seedPlayerProfile({ id: "viewer-1", displayName: "נועה", username: "viewer1" });
});

// 1
test("1: an unknown username returns null (no crash) rather than throwing", async () => {
  const view = await getPublicProfileView("no-such-user", null);
  assert.equal(view, null);
});

// 2
test("2: the owner viewing their own profile renders — isOwner true, friendshipStatus self", async () => {
  const view = await getPublicProfileView("owner1", "owner-1");
  assert.ok(view);
  assert.equal(view?.isOwner, true);
  assert.equal(view?.friendshipStatus, "self");
  assert.equal(view?.incomingFriendRequestId, null);
  assert.equal(view?.playerId, "owner-1");
  assert.equal(view?.username, "owner1");
});

// 3
test("3: another authenticated player's public profile renders — isOwner false, no crash reaching getFriendsAndRequests-adjacent friendship lookups", async () => {
  const view = await getPublicProfileView("owner1", "viewer-1");
  assert.ok(view);
  assert.equal(view?.isOwner, false);
  assert.equal(view?.friendshipStatus, "none");
});

// 4
test("4: an anonymous/no-session viewer still renders the profile — isOwner false, friendshipStatus none", async () => {
  const view = await getPublicProfileView("owner1", null);
  assert.ok(view);
  assert.equal(view?.isOwner, false);
  assert.equal(view?.friendshipStatus, "none");
});

// 4b — STAFF / MODERATION — ROLE PRESENTATION — targetStaffRole reflects
// the profile's own PERSISTED staff role (never inferred from anything
// else), and is null for a plain player.
test("4b: targetStaffRole reflects the profile owner's real persisted StaffMember role", async () => {
  seedStaffMember({ playerId: "owner-1", role: "DEPUTY" });
  const view = await getPublicProfileView("owner1", null);
  assert.equal(view?.targetStaffRole, "DEPUTY");
});

test("4c: targetStaffRole is null for a plain player with no StaffMember row", async () => {
  const view = await getPublicProfileView("owner1", null);
  assert.equal(view?.targetStaffRole, null);
});

// 4d — DEV BUG FIX REGRESSION GUARD — staff identity is PUBLIC
// presentation: targetStaffRole must be IDENTICAL regardless of who is
// looking, since getPublicProfileView never even branches on viewerUserId
// to compute it (see this function's own doc comment on targetStaffRole in
// public-profile-view.service.ts). Exercises the exact three viewer shapes
// a real request can have: another staff member, a plain player, and no
// session at all.
test("4d: targetStaffRole is identical for a staff viewer, a plain-player viewer, and an anonymous (null) viewer — never gated by who is looking", async () => {
  seedStaffMember({ playerId: "owner-1", role: "SUPPORT" });
  seedPlayerProfile({ id: "other-staff-1", username: "otherstaff1" });
  seedStaffMember({ playerId: "other-staff-1", role: "OWNER" });

  // viewer-1 (seeded in beforeEach) has no StaffMember row of its own — a
  // genuine plain-player viewer. other-staff-1 is a genuine staff viewer.
  // null is the anonymous/no-session case.
  const asStaffViewer = await getPublicProfileView("owner1", "other-staff-1");
  const asPlainPlayerViewer = await getPublicProfileView("owner1", "viewer-1");
  const asAnonymousViewer = await getPublicProfileView("owner1", null);

  assert.equal(asStaffViewer?.targetStaffRole, "SUPPORT");
  assert.equal(asPlainPlayerViewer?.targetStaffRole, "SUPPORT");
  assert.equal(asAnonymousViewer?.targetStaffRole, "SUPPORT");
});

// 5 — friendshipStatus states.
test("5: friendshipStatus reflects a pending-outgoing request (viewer sent it)", async () => {
  seedFriendship({ requesterId: "viewer-1", addresseeId: "owner-1", status: "pending" });
  const view = await getPublicProfileView("owner1", "viewer-1");
  assert.equal(view?.friendshipStatus, "pending-outgoing");
  assert.equal(view?.incomingFriendRequestId, null);
});

test("5b: friendshipStatus reflects a pending-incoming request (owner sent it to the viewer), and exposes the request id", async () => {
  seedFriendship({ requesterId: "owner-1", addresseeId: "viewer-1", status: "pending" });
  const view = await getPublicProfileView("owner1", "viewer-1");
  assert.equal(view?.friendshipStatus, "pending-incoming");
  assert.ok(view?.incomingFriendRequestId, "the underlying request id must be exposed so AddFriendButton can accept/decline");
});

test("5c: friendshipStatus reflects an accepted friendship regardless of direction", async () => {
  seedFriendship({ requesterId: "viewer-1", addresseeId: "owner-1", status: "accepted" });
  const view = await getPublicProfileView("owner1", "viewer-1");
  assert.equal(view?.friendshipStatus, "friends");
  assert.equal(view?.incomingFriendRequestId, null);
});

// 6 — non-owner cannot see edit controls (source-level: the actual gate).
test("6: (source) the profile header only ever renders the edit-profile button for the owner", () => {
  const src = fs.readFileSync("features/profile/components/ProfileHeader.tsx", "utf8");
  assert.match(src, /view\.isOwner\s*\?\s*\(?\s*<button[\s\S]*?ערוך פרופיל/, "Edit Profile must be gated behind view.isOwner");
  assert.ok(src.includes("<AddFriendButton"), "a non-owner viewer must see AddFriendButton instead");
});

// 7 — existing profile privacy still works.
test("7: existing privacy toggles still hide party/stats/aboutMe from a non-owner viewer", async () => {
  seedPlayerProfile({
    id: "private-owner",
    displayName: "פרטי",
    username: "privateowner",
    showPartyOnProfile: false,
    showStatsOnProfile: false,
    showAboutMeOnProfile: false,
    aboutMe: "בעל הפרופיל כתב כאן משהו",
  });

  const view = await getPublicProfileView("privateowner", "viewer-1");
  assert.equal(view?.party, null, "party must be hidden when showPartyOnProfile is false");
  assert.equal(view?.stats, null, "stats must be hidden when showStatsOnProfile is false");
  assert.equal(view?.aboutMe, null, "aboutMe must be hidden when showAboutMeOnProfile is false");
});

test("7b: a visible aboutMe still comes through for a non-owner viewer", async () => {
  seedPlayerProfile({ id: "open-owner", displayName: "פתוח", username: "openowner", aboutMe: "שלום לכולם!" });
  const view = await getPublicProfileView("openowner", "viewer-1");
  assert.equal(view?.aboutMe, "שלום לכולם!");
});
