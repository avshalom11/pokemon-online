"use server";

import { revalidatePath } from "next/cache";

import { changeUsername, type ChangeUsernameResult } from "@/features/profile/services/change-username.service";
import { changeUsernameSchema } from "@/features/profile/validation/profile.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type ChangeUsernameActionResult = ChangeUsernameResult;

// Thin Server Action — same shape as every other action in this codebase
// (resolve session, zod-validate, delegate to the service). The acting
// player/user is always resolved server-side from the session
// (getCurrentSession/getPlayerProfile) — never a client-supplied id, so
// this can only ever rename and charge the authenticated caller themselves.
export async function changeUsernameAction(input: unknown): Promise<ChangeUsernameActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = changeUsernameSchema.safeParse(input);
  if (!parsed.success) return { status: "error" };

  const currentUsername = session.user.username ?? session.user.name;
  const profile = await getPlayerProfile(session.user.id);

  const result = await changeUsername(profile.id, currentUsername, parsed.data.newUsername);

  if (result.status === "success") {
    // The route itself is keyed by username, so the new one needs its own
    // path revalidated (the old path simply stops resolving to anything on
    // its next visit). /home's nav card links to this same profile.
    revalidatePath(`/profile/${result.username}`);
    revalidatePath("/home");
  }

  return result;
}
