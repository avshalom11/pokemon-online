// MOVE SOUND TO TOP TOOLBAR — focused coverage that the soundEnabled
// preference persists through its OWN dedicated write path
// (update-sound-enabled.service.ts), separate from the big profile-edit
// form (which no longer sends or manages this field at all — see
// EditProfileModal.tsx). Runs the REAL updateSoundEnabled against the
// in-memory fake DB directly — unlike the big updateProfile function
// (update-profile.service.ts), this one has no next/headers dependency (no
// username handling), so it CAN be imported and exercised directly here.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { updateSoundEnabled } from "./update-sound-enabled.service.ts";
import { getPlayerProfileRow, resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID });
});

test("soundEnabled defaults to true for a freshly-seeded profile (matches the schema's own @default(true))", () => {
  const row = getPlayerProfileRow(PLAYER_ID)!;
  assert.equal(row.soundEnabled, true);
});

test("preference persists: updateSoundEnabled(false) actually persists", async () => {
  await updateSoundEnabled(PLAYER_ID, false);
  assert.equal(getPlayerProfileRow(PLAYER_ID)!.soundEnabled, false);
});

test("preference persists: toggling back ON persists too", async () => {
  await updateSoundEnabled(PLAYER_ID, false);
  await updateSoundEnabled(PLAYER_ID, true);
  assert.equal(getPlayerProfileRow(PLAYER_ID)!.soundEnabled, true);
});

test("changing the sound setting never touches Gym progression / currency / any other profile field", async () => {
  seedPlayerProfile({ id: PLAYER_ID, regionId: "hoenn", level: 12, experience: 4000, coins: 999 });

  await updateSoundEnabled(PLAYER_ID, false);

  const row = getPlayerProfileRow(PLAYER_ID)!;
  assert.equal(row.regionId, "hoenn");
  assert.equal(row.level, 12);
  assert.equal(row.experience, 4000);
  assert.equal(row.coins, 999);
});

// SINGLE WRITE PATH — the big profile-edit form must no longer send or
// persist this field at all; updateSoundEnabled is the ONLY place it's
// ever written.
test("(source) the big updateProfile() form-save function no longer touches soundEnabled at all — the toolbar's updateSoundEnabled is the ONLY write path", () => {
  const src = fs.readFileSync("features/profile/services/update-profile.service.ts", "utf8");
  assert.ok(!src.includes("soundEnabled"), "the full profile-edit save must never read/write soundEnabled — only the dedicated toolbar action does");

  const dedicatedSrc = fs.readFileSync("features/profile/services/update-sound-enabled.service.ts", "utf8");
  assert.ok(dedicatedSrc.includes("export async function updateSoundEnabled(playerId: string, soundEnabled: boolean): Promise<void> {"));
});

test("(source) updateProfileSchema (the big edit-form validator) no longer includes soundEnabled — it's not part of that form anymore", () => {
  const schemaSrc = fs.readFileSync("features/profile/validation/profile.schema.ts", "utf8");
  assert.ok(!schemaSrc.includes("soundEnabled"), "soundEnabled must be fully removed from the edit-form schema");
});

test("(source) the profile edit view model no longer exposes soundEnabled — the edit form has nothing left to seed/display for it", () => {
  const typesSrc = fs.readFileSync("features/profile/types/profile.types.ts", "utf8");
  const editViewModelBlock = typesSrc.slice(typesSrc.indexOf("export interface ProfileEditViewModel"), typesSrc.indexOf("export interface ProfileEditViewModel") + 600);
  assert.ok(!editViewModelBlock.includes("soundEnabled"));

  const editViewServiceSrc = fs.readFileSync("features/profile/services/profile-edit-view.service.ts", "utf8");
  assert.ok(!editViewServiceSrc.includes("soundEnabled"));
});

test("(source) updateSoundEnabledAction resolves ownership from the authenticated session only — never a client-supplied playerId", () => {
  const src = fs.readFileSync("features/profile/actions/update-profile.action.ts", "utf8");
  assert.ok(src.includes("export async function updateSoundEnabledAction(soundEnabled: boolean)"));
  const actionBody = src.slice(src.indexOf("export async function updateSoundEnabledAction("));
  assert.ok(actionBody.includes("await getCurrentSession()"));
  assert.ok(actionBody.includes("const profile = await getPlayerProfile(session.user.id);"));
  assert.ok(actionBody.includes("updateSoundEnabled(profile.id, soundEnabled)"), "must call the session-resolved profile id, never a client-supplied one");
});
