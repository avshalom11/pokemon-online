"use server";

import { MARKETPLACE_LOCKED_MESSAGE_HE } from "@/features/marketplace/data/marketplace-labels";
import { cancelMarketplaceListing } from "@/features/marketplace/services/cancel-listing.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type CancelMarketplaceListingActionResult =
  | { status: "success" }
  | { status: "not-owner"; message: string }
  | { status: "listing-unavailable"; message: string }
  | { status: "unauthenticated"; message: string }
  | { status: "level-locked"; message: string };

const ERROR_MESSAGES = {
  "not-owner": "ניתן לבטל רק מכירה שפרסמת בעצמך.",
  "listing-unavailable": "המכירה כבר השתנתה או אינה זמינה לביטול.",
  "level-locked": MARKETPLACE_LOCKED_MESSAGE_HE,
} as const;

// MARKETPLACE PHASE 5 — the one entry point the listing detail UI's "בטל
// מכירה" button calls. `sellerId` is never a parameter here at all:
// resolved entirely from the authenticated session server-side, same
// "never a client-suppliable identity field" posture as
// purchase-listing.action.ts/create-listing.action.ts. Passes through the
// specific failure reason (not-owner vs. listing-unavailable) rather than
// collapsing to one generic error, same reasoning purchase-listing.action.ts's
// own doc comment already gives: listing-unavailable means the data itself
// went stale (worth refreshing the Marketplace), not-owner never happens
// through normal UI use (Cancel is only ever offered on the viewer's own
// listing) but is still a distinct, honest reason if it somehow does.
export async function cancelMarketplaceListingAction(listingId: string): Promise<CancelMarketplaceListingActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "unauthenticated", message: "יש להתחבר מחדש." };

  const profile = await getPlayerProfile(session.user.id);
  const result = await cancelMarketplaceListing(profile.id, listingId);

  if (result.status === "success") {
    return { status: "success" };
  }

  return { status: result.status, message: ERROR_MESSAGES[result.status] };
}
