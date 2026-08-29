"use server";

import { getTmInfo, type TmInfoResult } from "@/features/tm-system/services/tm-info.service";
import { tmUseCandidatesRequestSchema } from "@/features/tm-system/validation/teach-tm.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type TmInfoActionResult = TmInfoResult | { status: "error" };

// Thin Server Action wrapper — same shape as every other action file in
// this codebase (resolve session, resolve profile, validate, delegate).
// Read-only: never mutates anything, so unlike teachTmAction there is no
// revalidatePath call here. Reuses tmUseCandidatesRequestSchema (a plain
// `{ itemId }` shape) rather than declaring a second, identical schema.
export async function getTmInfoAction(itemId: string): Promise<TmInfoActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = tmUseCandidatesRequestSchema.safeParse({ itemId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  return getTmInfo(profile.id, parsed.data.itemId);
}
