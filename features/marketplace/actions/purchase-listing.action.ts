"use server";

import { purchaseMarketplaceListing } from "@/features/marketplace/services/purchase-listing.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type PurchaseMarketplaceListingActionResult =
  | { status: "success" }
  | { status: "own-listing"; message: string }
  | { status: "listing-unavailable"; message: string }
  | { status: "insufficient-funds"; message: string }
  | { status: "unauthenticated"; message: string };

const ERROR_MESSAGES = {
  "own-listing": "לא ניתן לקנות מכירה שפרסמת בעצמך.",
  "listing-unavailable": "המכירה השתנתה או כבר אינה זמינה. נא לבדוק את הפרטים המעודכנים לפני קנייה חוזרת.",
  "insufficient-funds": "אין לך מספיק כסף ו/או זהב לרכישה זו.",
} as const;

// MARKETPLACE PHASE 4 — the one entry point the listing detail UI's Buy
// button calls. `buyerId` is never a parameter here at all: resolved
// entirely from the authenticated session server-side, same "never a
// client-suppliable identity field" posture as
// create-listing.action.ts/request-account-deletion.action.ts and every
// other mutating action in this codebase.
//
// Deliberately does NOT collapse every failure into one generic
// {status:"error", message} shape the way create-listing.action.ts does:
// this phase's own spec requires that a stale/non-active listing make the
// buyer "re-review" it, which means the client needs to tell "the listing
// itself changed underneath you" (listing-unavailable — worth refetching
// the Marketplace immediately) apart from "your own balance is too low"
// (insufficient-funds — retrying the exact same listing needs the player
// to act, not a refetch). Passing through the real, specific result lets
// the UI make that distinction; create-listing's own failures never have
// this external-staleness dimension, so its simpler shape stays as-is.
export async function purchaseMarketplaceListingAction(listingId: string): Promise<PurchaseMarketplaceListingActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "unauthenticated", message: "יש להתחבר מחדש." };

  const profile = await getPlayerProfile(session.user.id);
  const result = await purchaseMarketplaceListing(profile.id, listingId);

  if (result.status === "success") {
    return { status: "success" };
  }

  return { status: result.status, message: ERROR_MESSAGES[result.status] };
}
