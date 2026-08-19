"use server";

import { revalidatePath } from "next/cache";

import { updateProfile, type UpdateProfileResult } from "@/features/profile/services/update-profile.service";
import { updateSoundEnabled } from "@/features/profile/services/update-sound-enabled.service";
import { updateProfileSchema } from "@/features/profile/validation/profile.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type UpdateProfileActionResult = UpdateProfileResult;

// Thin Server Action — same shape as every other action in this codebase
// (resolve session, zod-validate, delegate to the service). Ownership is
// never trusted from the client: the profile actually written is always
// resolved server-side from the session's own user id
// (getPlayerProfile(session.user.id)), and the username-change path inside
// updateProfile identifies the caller purely via the request's own auth
// cookie — never anything this input could influence.
export async function updateProfileAction(input: unknown): Promise<UpdateProfileActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error", message: "יש להתחבר מחדש." };

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "הנתונים שהוזנו אינם תקינים." };

  const currentUsername = session.user.username ?? session.user.name;
  const profile = await getPlayerProfile(session.user.id);

  const result = await updateProfile(profile.id, currentUsername, parsed.data);

  if (result.status === "success") {
    // The route itself is keyed by username, so a changed username needs
    // its NEW path revalidated (the old one simply stops resolving to
    // anything on its next visit — no stale cache to worry about there).
    // /home's nav card links to this same profile, so it needs a refresh
    // too whenever the target path changes.
    revalidatePath(`/profile/${result.username}`);
    revalidatePath("/home");
  }

  return result;
}

export type UpdateSoundEnabledActionResult = { status: "success" } | { status: "error" };

// MOVE SOUND TO TOP TOOLBAR (later task) — the toolbar sound control's own
// thin Server Action, same shape/ownership rule as updateProfileAction
// above (resolve session, resolve the acting profile from
// session.user.id — never a client-supplied id — delegate to the
// service). Deliberately not routed through updateProfileAction/
// updateProfileSchema: this toggles exactly one field and needs none of
// that action's username/content-block handling.
export async function updateSoundEnabledAction(soundEnabled: boolean): Promise<UpdateSoundEnabledActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  await updateSoundEnabled(profile.id, soundEnabled);

  return { status: "success" };
}
