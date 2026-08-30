"use server";

import { MARKETPLACE_LOCKED_MESSAGE_HE } from "@/features/marketplace/data/marketplace-labels";
import { cancelEditListing } from "@/features/marketplace/services/cancel-edit-listing.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type CancelEditListingActionResult =
  | { status: "success" }
  | { status: "not-owner"; message: string }
  | { status: "listing-unavailable"; message: string }
  | { status: "unauthenticated"; message: string }
  | { status: "level-locked"; message: string };

const ERROR_MESSAGES = {
  "not-owner": "ניתן לבטל עריכה רק של מכירה שפרסמת בעצמך.",
  "listing-unavailable": "המכירה כבר אינה במצב עריכה.",
  "level-locked": MARKETPLACE_LOCKED_MESSAGE_HE,
} as const;

// MARKETPLACE PHASE 6 — called when the seller backs out of the edit UI
// without saving (its own "ביטול"/close button, not a plain fire-and-forget
// — the caller awaits this before refreshing, since the listing is
// genuinely stuck "editing" server-side until this resolves it back to
// "active"). `sellerId` is never a parameter here at all: resolved entirely
// from the authenticated session server-side, same posture as every other
// mutating Marketplace action.
export async function cancelEditListingAction(listingId: string): Promise<CancelEditListingActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "unauthenticated", message: "יש להתחבר מחדש." };

  const profile = await getPlayerProfile(session.user.id);
  const result = await cancelEditListing(profile.id, listingId);

  if (result.status === "success") {
    return { status: "success" };
  }

  return { status: result.status, message: ERROR_MESSAGES[result.status] };
}
