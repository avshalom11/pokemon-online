// PROFILE ACHIEVEMENTS — focused coverage that the showGymAchievementsOnProfile
// toggle actually persists through the EXISTING profile-update
// architecture (update-profile.service.ts), never a separate settings
// system.
//
// update-profile.service.ts itself cannot be imported directly under this
// project's node:test runner: it pulls in `next/headers` (via Better
// Auth's `auth.api.updateUser`), which this repo's test module resolution
// cannot resolve outside a real Next.js server context — a pre-existing
// environment limitation of that file (unrelated to this task; no test
// anywhere in features/profile/ has ever been able to import it). This
// file therefore verifies the two halves that ARE independently testable:
// (a) the fake DB itself correctly persists the new field through a plain
// Prisma update (proving the underlying write mechanism works), and (b)
// update-profile.service.ts's own SOURCE actually forwards
// input.showGymAchievementsOnProfile into that same Prisma call — the
// same "source-boundary check for something the test harness can't
// exercise directly" technique this project's own Gym tasks already use
// repeatedly (see e.g. gym-battle-polish-boundary.test.ts).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { prisma } from "@/lib/db/prisma";
import { getPlayerProfileRow, resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID });
});

test("9: showGymAchievementsOnProfile defaults to true for a freshly-seeded profile (matches the schema's own @default(true))", () => {
  const row = getPlayerProfileRow(PLAYER_ID)!;
  assert.equal(row.showGymAchievementsOnProfile, true);
});

test("14: turning visibility OFF persists through a plain PlayerProfile update (the same write update-profile.service.ts performs)", async () => {
  await prisma.playerProfile.update({ where: { id: PLAYER_ID }, data: { showGymAchievementsOnProfile: false } });
  assert.equal(getPlayerProfileRow(PLAYER_ID)!.showGymAchievementsOnProfile, false);
});

test("14: turning visibility back ON persists too", async () => {
  await prisma.playerProfile.update({ where: { id: PLAYER_ID }, data: { showGymAchievementsOnProfile: false } });
  await prisma.playerProfile.update({ where: { id: PLAYER_ID }, data: { showGymAchievementsOnProfile: true } });
  assert.equal(getPlayerProfileRow(PLAYER_ID)!.showGymAchievementsOnProfile, true);
});

test("17: changing achievement visibility never touches any Gym progression field on the profile row", async () => {
  seedPlayerProfile({ id: PLAYER_ID, regionId: "hoenn", level: 12, experience: 4000 });

  await prisma.playerProfile.update({ where: { id: PLAYER_ID }, data: { showGymAchievementsOnProfile: false } });

  const row = getPlayerProfileRow(PLAYER_ID)!;
  assert.equal(row.regionId, "hoenn", "region/progression fields must be completely untouched by a display-privacy update");
  assert.equal(row.level, 12);
  assert.equal(row.experience, 4000);
});

test("14 (source): update-profile.service.ts actually forwards input.showGymAchievementsOnProfile into the Prisma update — the real wiring behind the fake-DB checks above", () => {
  const src = fs.readFileSync("features/profile/services/update-profile.service.ts", "utf8");
  assert.ok(
    src.includes("showGymAchievementsOnProfile: input.showGymAchievementsOnProfile,"),
    "updateProfile must persist the new toggle exactly like the three existing show*OnProfile fields"
  );
});

test("13 (source): only the server-resolved playerId (never a client-supplied id) is ever passed into updateProfile — ownership is never trusted from the client", () => {
  const src = fs.readFileSync("features/profile/actions/update-profile.action.ts", "utf8");
  assert.ok(src.includes("const profile = await getPlayerProfile(session.user.id);"), "the acting profile must be resolved from the authenticated session, never client input");
  assert.ok(src.includes("await updateProfile(profile.id, currentUsername, parsed.data);"), "updateProfile must be called with the session-resolved profile id");
});
