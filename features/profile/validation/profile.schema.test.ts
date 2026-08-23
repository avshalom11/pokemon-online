// SECURITY & ACCOUNT — direct coverage for profile.schema.ts's schemas.
// Plain Zod, no next/headers dependency, so unlike the services/actions
// that consume these, this file IS importable directly.
import assert from "node:assert/strict";
import { test } from "node:test";

import { changeUsernameSchema, updateProfileSchema } from "@/features/profile/validation/profile.schema";

test("changeUsernameSchema accepts a valid username", () => {
  const parsed = changeUsernameSchema.safeParse({ newUsername: "new_trainer1" });
  assert.ok(parsed.success);
});

test("changeUsernameSchema rejects a too-short username", () => {
  const parsed = changeUsernameSchema.safeParse({ newUsername: "ab" });
  assert.ok(!parsed.success);
});

test("changeUsernameSchema rejects characters outside the shared username pattern (spaces, symbols)", () => {
  assert.ok(!changeUsernameSchema.safeParse({ newUsername: "not valid!" }).success);
});

test("updateProfileSchema no longer accepts/requires a username field — username changes go through changeUsernameSchema's own dedicated (100 Gold) flow", () => {
  const parsed = updateProfileSchema.safeParse({
    aboutMe: "",
    avatarDexNumber: null,
    themeId: "default",
    showPartyOnProfile: true,
    showStatsOnProfile: true,
    showAboutMeOnProfile: true,
    showGymAchievementsOnProfile: true,
    contentBlocks: [],
  });
  assert.ok(parsed.success, "the free profile-content save must not require a username at all");
  assert.ok(!("username" in (parsed.success ? parsed.data : {})), "updateProfileSchema must never carry a username field");
});
