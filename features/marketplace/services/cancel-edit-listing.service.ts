import "server-only";

import { prisma } from "@/lib/db/prisma";

export type CancelEditListingResult = { status: "success" } | { status: "not-owner" } | { status: "listing-unavailable" };

// MARKETPLACE PHASE 6 — the seller backs out of editing without saving:
// flips "editing" back to "active". Since enterEditListing never touched
// any Pokémon/item lock or the price, and this function doesn't either,
// "original listing unchanged" is true automatically — there is nothing to
// restore, only a status flip to undo.
//
// Same single-guarded-updateMany shape as enterEditListing, wrapped in
// prisma.$transaction for the same reason that file's own doc comment
// gives (consistency with every other mutating Marketplace service, and
// this project's own fake-DB test harness only serializes calls that go
// through $transaction): `where: { id, sellerId, status: "editing" }` is
// what makes this safe against a stale/already-resolved edit session (e.g.
// the seller already saved or cancelled from another tab).
export async function cancelEditListing(sellerId: string, listingId: string): Promise<CancelEditListingResult> {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.marketplaceListing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return { status: "listing-unavailable" };
    }
    if (listing.sellerId !== sellerId) {
      return { status: "not-owner" };
    }
    if (listing.status !== "editing") {
      return { status: "listing-unavailable" };
    }

    const restored = await tx.marketplaceListing.updateMany({
      where: { id: listingId, sellerId, status: "editing" },
      data: { status: "active" },
    });

    return restored.count > 0 ? { status: "success" } : { status: "listing-unavailable" };
  });
}
