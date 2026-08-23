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
// (getPlayerProfile(session.user.id)). Username is no longer part of this
// action at all — see change-username.action.ts for that dedicated,
// 100-Gold flow.
export async function updateProfileAction(input: unknown): Promise<UpdateProfileActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error", message: "יש להתחבר מחדש." };

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "הנתונים שהוזנו אינם תקינים." };

  const currentUsername = session.user.username ?? session.user.name;
  const profile = await getPlayerProfile(session.user.id);

  const result = await updateProfile(profile.id, parsed.data);

  if (result.status === "success") {
    // Avatar/theme changes can affect other surfaces that read this same
    // profile (e.g. /home's nav card) — the route itself is keyed by
    // username, which this action can no longer change, so it's always
    // this same current path.
    revalidatePath(`/profile/${currentUsername}`);
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
// that action's content-block handling.
export async function updateSoundEnabledAction(soundEnabled: boolean): Promise<UpdateSoundEnabledActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  await updateSoundEnabled(profile.id, soundEnabled);

  return { status: "success" };
}
