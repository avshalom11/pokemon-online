"use server";

import { revalidatePath } from "next/cache";

import { isValidRegionId } from "@/features/regions/data/region-registry";
import { travelToRegion } from "@/features/regions/services/region.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { RegionId } from "@/shared/types/region";

export type SelectRegionActionResult =
  | { status: "success"; regionId: RegionId }
  | { status: "error"; message: string };

const INSUFFICIENT_FUNDS_MESSAGE = "אין לך מספיק כסף כדי לעבור למחוז הזה.";

// Thin Server Action — same shape as every other action in this codebase
// (resolve session, validate input, delegate to the service; see
// update-profile.action.ts). The profile actually written is always
// resolved server-side from the session's own user id
// (getPlayerProfile(session.user.id)) — a client can never target another
// player's profile via this action, since regionId is the only
// client-supplied value and it never carries a player/profile id or a
// price (travelToRegion resolves the cost itself, server-side, from
// region-travel-cost.config.ts).
//
// REGION TRAVEL COST — the "already in this region" check happens here
// too (not just inside travelToRegion's own atomic guard): the common,
// non-racing case (a player clicking their own already-active region)
// short-circuits before ever opening a transaction or touching currency,
// which is both cheaper and keeps this action's own success path free of
// an unnecessary DB round trip. travelToRegion's own guard is what
// protects the racing/duplicate-request case this earlier read can't
// (see that function's own doc comment).
export async function selectRegionAction(regionId: string): Promise<SelectRegionActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error", message: "יש להתחבר מחדש." };

  if (!isValidRegionId(regionId)) {
    return { status: "error", message: "אזור לא תקין." };
  }

  const profile = await getPlayerProfile(session.user.id);

  if (profile.regionId !== regionId) {
    const result = await travelToRegion(profile.id, regionId);
    if (result === "insufficient-funds") {
      return { status: "error", message: INSUFFICIENT_FUNDS_MESSAGE };
    }
  }

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
