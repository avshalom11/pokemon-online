"use server";

import { MARKETPLACE_LOCKED_MESSAGE_HE } from "@/features/marketplace/data/marketplace-labels";
import { enterEditListing } from "@/features/marketplace/services/enter-edit-listing.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type EnterEditListingActionResult =
  | { status: "success" }
  | { status: "not-owner"; message: string }
  | { status: "listing-unavailable"; message: string }
  | { status: "unauthenticated"; message: string }
  | { status: "level-locked"; message: string };

const ERROR_MESSAGES = {
  "not-owner": "ניתן לערוך רק מכירה שפרסמת בעצמך.",
  "listing-unavailable": "המכירה כבר השתנתה או אינה זמינה לעריכה.",
  "level-locked": MARKETPLACE_LOCKED_MESSAGE_HE,
} as const;

// MARKETPLACE PHASE 6 — the one entry point the listing detail UI's "ערוך
// מכירה" button calls. `sellerId` is never a parameter here at all:
// resolved entirely from the authenticated session server-side, same
// posture as every other mutating Marketplace action.
export async function enterEditListingAction(listingId: string): Promise<EnterEditListingActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "unauthenticated", message: "יש להתחבר מחדש." };

  const profile = await getPlayerProfile(session.user.id);
  const result = await enterEditListing(profile.id, listingId);

  if (result.status === "success") {
    return { status: "success" };
  }

  return { status: result.status, message: ERROR_MESSAGES[result.status] };
}
