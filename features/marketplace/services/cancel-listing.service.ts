import "server-only";

import { releaseInventoryQuantity } from "@/features/marketplace/services/inventory-lock.service";
import { MARKETPLACE_LISTING_BUYABLE_STATUS } from "@/features/marketplace/types/marketplace.types";
import { prisma } from "@/lib/db/prisma";

export type CancelListingResult =
  | { status: "success" }
  | { status: "not-owner" }
  // Not found, already sold, already cancelled, or currently being edited
  // — same "stale view, must re-review" bucket purchase-listing.service.ts
  // already establishes for the identical set of non-active states.
  | { status: "listing-unavailable" };

// Never exported — same "throw to abort a multi-step transaction, never a
// plain early return once something has already been written" idiom
// create-listing.service.ts's CreateListingAbort and
// purchase-listing.service.ts's PurchaseAbort both already establish.
class CancelAbort extends Error {
  result: Exclude<CancelListingResult, { status: "success" }>;

  constructor(result: Exclude<CancelListingResult, { status: "success" }>) {
    super(result.status);
    this.result = result;
  }
}

// MARKETPLACE PHASE 5 — cancels the seller's own active listing, atomically,
// returning every locked asset to normal availability. Never trusts
// `sellerId` from anywhere but its own caller (features/marketplace/
// actions/cancel-listing.action.ts resolves it from the authenticated
// session) — same posture every other mutating service in this codebase
// already has.
//
// ONE prisma.$transaction, in order:
//   1. Read the listing. Not found -> "listing-unavailable" (clean early
//      return — nothing written yet). Not this seller's own -> "not-owner"
//      (same early-return safety; the UI never offers Cancel for another
//      seller's listing, so this only guards a direct/stale call). Not
//      currently "active" (sold/editing/already-cancelled) ->
//      "listing-unavailable".
//   2. ATOMIC CLAIM = FINISH AS CANCELLED, in one write:
//      `updateMany({ where: { id, sellerId, status: "active" }, data: {
//      status: "cancelled", cancelledAt } })` — the exact same
//      guarded-updateMany-on-status idiom purchase-listing.service.ts uses
//      for its own claim, which is what makes "purchase vs cancel race:
//      only one may win" true for free: whichever write actually commits
//      first flips `status` away from "active", so the loser's own guard
//      matches zero rows and this throws CancelAbort("listing-unavailable"),
//      rolling back cleanly.
//   3. Release every Pokémon lock: just delete the MarketplaceListingPokemon
//      rows for this listing — PlayerPokemon itself (ownership, partySlot)
//      is never touched here. Ownership was never transferred at listing
//      time (only DB seller PlayerProfile ownership at listing/removed
//      later only on purchase) and partySlot was already cleared to null
//      when the listing was first created — so "Pokémon stays owned by the
//      seller, in storage, never restored to its previous party slot" is
//      true automatically, with no write needed to make it true.
//   4. Release every item lock: decrement lockedQuantity back down by the
//      exact listed amount (raw `quantity` is never touched — the seller
//      never lost it), then delete the MarketplaceListingItem rows. No
//      currency changes anywhere in this function.
export async function cancelMarketplaceListing(sellerId: string, listingId: string): Promise<CancelListingResult> {
  try {
    return await prisma.$transaction(async (tx) => {
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
        data: { status: "cancelled", cancelledAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new CancelAbort({ status: "listing-unavailable" });
      }

      await tx.marketplaceListingPokemon.deleteMany({ where: { listingId } });

      const lockedItems = await tx.marketplaceListingItem.findMany({ where: { listingId } });
      for (const { itemId, quantity } of lockedItems) {
        const released = await releaseInventoryQuantity(tx, sellerId, itemId, quantity);
        if (!released) {
          // Never expected in correct operation (this exact quantity was
          // locked at listing-creation/edit time and nothing else ever
          // decrements lockedQuantity outside a sale) — defensive backstop
          // only, same "abort -> rollback everything" posture as every
          // other guard in this feature.
          throw new CancelAbort({ status: "listing-unavailable" });
        }
      }
      if (lockedItems.length > 0) {
        await tx.marketplaceListingItem.deleteMany({ where: { listingId } });
      }

      return { status: "success" };
    });
  } catch (error) {
    if (error instanceof CancelAbort) {
      return error.result;
    }
    throw error;
  }
}
