import "server-only";

import { MARKETPLACE_LISTING_BUYABLE_STATUS } from "@/features/marketplace/types/marketplace.types";
import { prisma } from "@/lib/db/prisma";

export type EnterEditListingResult = { status: "success" } | { status: "not-owner" } | { status: "listing-unavailable" };

// MARKETPLACE PHASE 6 — flips the seller's own active listing to "editing".
// Deliberately touches nothing else: no Pokémon/item lock changes, no price
// change — entering edit mode is purely a status transition that makes the
// listing unbuyable/uncancellable-by-purchase-or-cancel while the seller
// works on it, exactly per this phase's own spec ("original listing
// unchanged" if the seller backs out via cancel-edit is only true because
// nothing was ever touched here in the first place).
//
// The single guarded `updateMany` below (`where: { id, sellerId, status:
// "active" }`) is the same guarded-updateMany-on-status idiom
// purchase-listing.service.ts and cancel-listing.service.ts already use for
// their own claims — this is exactly what makes "purchase/cancel vs
// enter-edit: only one wins" true for free: whichever operation's write
// commits first flips `status` away from "active", so every other
// concurrent attempt's own identically-shaped guard simply matches zero
// rows.
//
// Wrapped in prisma.$transaction even though it's a single write — the
// write itself is already atomic in Postgres regardless, but every other
// mutating Marketplace service in this feature always runs through
// $transaction (never a bare call), and this project's own fake-DB test
// harness only serializes concurrent calls that go through $transaction —
// a bare call outside one can genuinely interleave with an in-flight
// transaction in the fake even though real Postgres would still keep the
// single UPDATE row-safe. Matching the established convention here avoids
// that gap entirely rather than relying on a real-vs-fake distinction.
export async function enterEditListing(sellerId: string, listingId: string): Promise<EnterEditListingResult> {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.marketplaceListing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return { status: "listing-unavailable" };
    }
    if (listing.sellerId !== sellerId) {
      return { status: "not-owner" };
    }
    if (listing.status !== MARKETPLACE_LISTING_BUYABLE_STATUS) {
      return { status: "listing-unavailable" };
    }

    const claimed = await tx.marketplaceListing.updateMany({
      where: { id: listingId, sellerId, status: MARKETPLACE_LISTING_BUYABLE_STATUS },
      data: { status: "editing" },
    });

    return claimed.count > 0 ? { status: "success" } : { status: "listing-unavailable" };
  });
}
