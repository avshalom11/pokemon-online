// PROFILE ACHIEVEMENTS — source-level boundary coverage for the pieces
// this project's test harness genuinely cannot exercise directly: the
// User/username-joined getPublicProfileView query (the fake Prisma double
// has no `user` table / `username` lookup support — see this task's own
// research notes) and any React-render behavior (no DOM/render harness
// exists anywhere in this repo). Same established technique every prior
// Gym task's own *-boundary.test.ts files already use — reading the
// actual source text of the files this task changed.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const publicProfileViewSrc = fs.readFileSync("features/profile/services/public-profile-view.service.ts", "utf8");
const achievementsSectionSrc = fs.readFileSync("features/profile/components/ProfileAchievementsSection.tsx", "utf8");
const profileContentSrc = fs.readFileSync("features/profile/components/ProfileContent.tsx", "utf8");

test("9: showGymAchievementsOnProfile is coalesced to true (default ON) on every public-profile read, same convention as the three existing toggles", () => {
  assert.ok(
    publicProfileViewSrc.includes("const showGymAchievementsOnProfile = profile.showGymAchievementsOnProfile ?? true;"),
    "a stale Prisma Client / not-yet-migrated row must still resolve to visible, never crash or silently hide"
  );
});

test("9/10/11: getPublicProfileView computes isOwner ONCE and passes it (plus the coalesced setting) into getProfileAchievementsView — the single privacy decision point for both owner and other-viewer cases", () => {
  assert.ok(publicProfileViewSrc.includes("const isOwner = viewerUserId !== null && viewerUserId === user.id;"));
  assert.ok(
    publicProfileViewSrc.includes("const achievements = await getProfileAchievementsView(profile.id, { isOwner, showGymAchievementsOnProfile });"),
    "the public view must delegate the actual gating decision to getProfileAchievementsView, never re-implement it inline"
  );
  assert.ok(publicProfileViewSrc.includes("achievements,"), "the resolved achievements view must actually be included in the returned PublicProfileView");
});

test("18: missing Badge/Medal artwork stays safe — the achievements section renders every image through the project's fallback-aware SpriteImage", () => {
  assert.ok(achievementsSectionSrc.includes("import { SpriteImage }"), "achievement images must go through SpriteImage, never a plain <img>");
  assert.ok(achievementsSectionSrc.includes("fallbackClassName="), "a missing image file must fall back safely instead of crashing/breaking the profile");
});

test("20: no Badge/Medal display logic (labels, image-path derivation) is duplicated in the React component — it only ever renders what the server-computed view already resolved", () => {
  assert.ok(!achievementsSectionSrc.includes("getGymBadgeDefinition"), "the component must never re-derive Badge labels/images itself");
  assert.ok(!achievementsSectionSrc.includes("getRegionalMedalDefinition"), "the component must never re-derive Medal labels/images itself");
  assert.ok(!achievementsSectionSrc.includes("getGymBadgeImageUrl") && !achievementsSectionSrc.includes("getRegionalMedalImageUrl"), "the component must never recompute an image path itself — imageUrl always comes from the view model");
  assert.ok(!achievementsSectionSrc.includes("REGION_GYM_SEQUENCE"), "ordering is the view-model's job (profile-achievements-view.service.ts) — the component only ever renders the array in the order it already received");
});

test("1: the profile page renders exactly one generic, extensible achievements section (ProfileAchievementsSection), not a Gym-only-named component", () => {
  assert.ok(profileContentSrc.includes("<ProfileAchievementsSection achievements={view.achievements} />"));
  assert.ok(!profileContentSrc.includes("ProfileBadgesSection"), "the old Gym-only-named placeholder must be fully replaced, not left as a second/duplicate section");
});
