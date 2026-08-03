"use server";

import { revalidatePath } from "next/cache";

import { isValidRegionId } from "@/features/regions/data/region-registry";
import { setActiveRegion } from "@/features/regions/services/region.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { RegionId } from "@/shared/types/region";

export type SelectRegionActionResult =
  | { status: "success"; regionId: RegionId }
  | { status: "error"; message: string };

// Thin Server Action — same shape as every other action in this codebase
// (resolve session, validate input, delegate to the service; see
// update-profile.action.ts). The profile actually written is always
// resolved server-side from the session's own user id
// (getPlayerProfile(session.user.id)) — a client can never target another
// player's profile via this action, since regionId is the only
// client-supplied value and it never carries a player/profile id.
export async function selectRegionAction(regionId: string): Promise<SelectRegionActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error", message: "יש להתחבר מחדש." };

  if (!isValidRegionId(regionId)) {
    return { status: "error", message: "אזור לא תקין." };
  }

  const profile = await getPlayerProfile(session.user.id);
  await setActiveRegion(profile.id, regionId);

  // Page-level revalidation for whoever navigates to these fresh; the
  // header itself (rendered by app/(game)/layout.tsx on every game page)
  // updates via WorldContent's own router.refresh() call right after this
  // action resolves, which re-runs the whole current route's server tree —
  // see that component's own doc comment for why revalidatePath alone
  // wouldn't reliably do that for a shared layout.
  revalidatePath("/world");
  revalidatePath("/map");
  revalidatePath("/home");

  return { status: "success", regionId };
}
