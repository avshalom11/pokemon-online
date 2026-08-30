import "server-only";

import { addInventoryItem } from "@/features/inventory/services/inventory.service";
import { getFirstEmptyPartySlot } from "@/features/party/utils/party-rules";
import { grantCurrencyRewards, spendCurrency } from "@/features/currency/services/currency-reward.service";
import { isMarketplaceUnlockedForPlayer } from "@/features/marketplace/services/marketplace-access.service";
import { marketplaceSaleNotificationMessage } from "@/features/marketplace/messages/marketplace-purchase-messages";
import { MARKETPLACE_LISTING_BUYABLE_STATUS } from "@/features/marketplace/types/marketplace.types";
import { createNotification } from "@/features/notifications/services/notification-service";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import { getPlayerIdentitiesByIds } from "@/lib/auth/player-profile";
import { prisma } from "@/lib/db/prisma";

export type PurchaseListingResult =
  | { status: "success" }
  | { status: "own-listing" }
  // Not found, already sold, cancelled, or currently being edited — the
  // buyer's view of this listing is stale either way; they must re-fetch
  // and re-review before trying again, never silently retried here.
  | { status: "listing-unavailable" }
  | { status: "insufficient-funds" }
  // PLAYER LEVEL ACCESS REQUIREMENTS — the buyer is below
  // MIN_MARKETPLACE_PLAYER_LEVEL. Checked before the listing is even read.
  | { status: "level-locked" };

// Never exported — same "throw to abort a multi-step transaction, never a
// plain early return once something has already been written" idiom
// create-listing.service.ts's own CreateListingAbort establishes. A plain
// early `return` from inside a transaction callback COMMITS whatever
// partial writes already happened — see that file's own doc comment.
class PurchaseAbort extends Error {
  result: Exclude<PurchaseListingResult, { status: "success" }>;

  constructor(result: Exclude<PurchaseListingResult, { status: "success" }>) {
    super(result.status);
    this.result = result;
  }
}

// MARKETPLACE PHASE 4 — buys an entire active listing, atomically, for its
// exact Money + Gold price. Never trusts `buyerId` from anywhere but its
// own caller (features/marketplace/actions/purchase-listing.action.ts
// resolves it from the authenticated session) — same posture every other
// mutating service in this codebase already has.
//
// ONE prisma.$transaction, in order:
//   1. Read the listing. Not found or not active -> "listing-unavailable"
//      (a clean early return — nothing has been written yet).
//   2. Reject the seller buying their own listing -> "own-listing" (same
//      early-return safety).
//   3. ATOMIC CLAIM = FINISH AS SOLD, in one write: `updateMany({ where:
//      { id, status: "active", sellerId: { not: buyerId } }, data: {
//      status: "sold", buyerId, soldAt } })`. This single guarded write is
//      simultaneously the race-safe "only one buyer/editor/canceller can
//      ever win this listing" claim AND the terminal "sold" state — there
//      is no separate intermediate "claimed" status in this schema (see
//      MarketplaceListingStatus's own doc comment), so claiming IS
//      finishing. `count === 0` here means someone else (another buyer, or
//      a future edit/cancel using this exact same guarded-updateMany-on-
//      status idiom) already changed this listing's status since the read
//      above — throws PurchaseAbort("listing-unavailable"), rolling back
//      cleanly with nothing else written.
//   4. Charge the buyer (spendCurrency, guarded — insufficient balance
//      throws PurchaseAbort("insufficient-funds"), rolling back the claim
//      from step 3 too, exactly per this phase's own "failed
//      currency/assets transfer must rollback the listing claim" rule).
//   5. Credit the seller the exact same amounts (grantCurrencyRewards) — no
//      fee taken anywhere.
//   6. Transfer every listed Pokémon: reassign ownership to the buyer,
//      sequentially placing each into the buyer's own first free party
//      slot (re-reading occupied slots before each one, so Pokémon #2 sees
//      the slot #1 just took), else storage — then delete its
//      MarketplaceListingPokemon lock row, since it's no longer locked in
//      any listing (leaving it would incorrectly mark the buyer's own new
//      Pokémon "already-listed" forever — see getPokemonMarketAvailability).
//   7. Transfer every listed item stack: decrement the seller's raw
//      quantity AND release the matching lockedQuantity in the same
//      guarded write (never leaving the two inconsistent), credit the
//      buyer via the existing addInventoryItem primitive, then delete the
//      MarketplaceListingItem row (its quantity is now fully accounted for
//      elsewhere).
//   8. SELLER PURCHASE NOTIFICATION — one MARKETPLACE_LISTING_SOLD
//      notification for the seller, listing the buyer's real username and
//      every Pokémon/item actually transferred above (see this function's
//      own inline comment right before the createNotification call for
//      why this step alone is what gives "no notification on a failed/
//      rolled-back purchase" for free).
export async function purchaseMarketplaceListing(buyerId: string, listingId: string): Promise<PurchaseListingResult> {
  if (!(await isMarketplaceUnlockedForPlayer(buyerId))) {
    return { status: "level-locked" };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const listing = await tx.marketplaceListing.findUnique({ where: { id: listingId } });
      if (!listing || listing.status !== MARKETPLACE_LISTING_BUYABLE_STATUS) {
        return { status: "listing-unavailable" };
      }

      if (listing.sellerId === buyerId) {
        return { status: "own-listing" };
      }

      const claimed = await tx.marketplaceListing.updateMany({
        where: { id: listingId, status: MARKETPLACE_LISTING_BUYABLE_STATUS, sellerId: { not: buyerId } },
        data: { status: "sold", buyerId, soldAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new PurchaseAbort({ status: "listing-unavailable" });
      }

      if (listing.priceMoney > 0) {
        const paid = await spendCurrency(tx, buyerId, "money", listing.priceMoney);
        if (!paid) throw new PurchaseAbort({ status: "insufficient-funds" });
      }
      if (listing.priceGold > 0) {
        const paid = await spendCurrency(tx, buyerId, "gold", listing.priceGold);
        if (!paid) throw new PurchaseAbort({ status: "insufficient-funds" });
      }

      await grantCurrencyRewards(tx, listing.sellerId, [
        { type: "money", amount: listing.priceMoney },
        { type: "gold", amount: listing.priceGold },
      ]);

      const lockedPokemon = await tx.marketplaceListingPokemon.findMany({ where: { listingId } });

      // SELLER PURCHASE NOTIFICATION — captured here, before the transfer
      // loop below reassigns ownership, so the notification always reflects
      // exactly what this listing actually contained (nickname/speciesId
      // themselves are never touched by the transfer, so fetching before vs.
      // after wouldn't matter for THIS data — but the listing's own rows are
      // about to be deleted, and this is the natural place to read them
      // while everything is still in scope).
      const soldPokemonRows =
        lockedPokemon.length > 0
          ? await tx.playerPokemon.findMany({ where: { id: { in: lockedPokemon.map((lock) => lock.playerPokemonId) } } })
          : [];
      const soldPokemonNames = soldPokemonRows.map(
        (row) => row.nickname ?? getSpeciesById(row.speciesId)?.name ?? row.speciesId
      );

      for (const lock of lockedPokemon) {
        const occupiedSlots = await tx.playerPokemon.findMany({
          where: { playerId: buyerId, partySlot: { not: null } },
          select: { partySlot: true },
        });
        const emptySlot = getFirstEmptyPartySlot(occupiedSlots.map((row) => row.partySlot as number));

        await tx.playerPokemon.update({
          where: { id: lock.playerPokemonId },
          data: { playerId: buyerId, partySlot: emptySlot },
        });
      }
      if (lockedPokemon.length > 0) {
        await tx.marketplaceListingPokemon.deleteMany({ where: { listingId } });
      }

      const lockedItems = await tx.marketplaceListingItem.findMany({ where: { listingId } });
      for (const { itemId, quantity } of lockedItems) {
        const released = await tx.playerInventoryItem.updateMany({
          where: { playerId: listing.sellerId, itemId, quantity: { gte: quantity }, lockedQuantity: { gte: quantity } },
          data: { quantity: { decrement: quantity }, lockedQuantity: { decrement: quantity } },
        });
        if (released.count === 0) {
          // Never expected in correct operation (the quantity was locked at
          // listing-creation time, and nothing else ever decrements
          // lockedQuantity) — defensive backstop only, same "abort ->
          // rollback everything" posture as every other guard above.
          throw new PurchaseAbort({ status: "listing-unavailable" });
        }
        await tx.playerInventoryItem.deleteMany({ where: { playerId: listing.sellerId, itemId, quantity: 0 } });

        await addInventoryItem(tx, buyerId, itemId, quantity);
      }
      if (lockedItems.length > 0) {
        await tx.marketplaceListingItem.deleteMany({ where: { listingId } });
      }

      // SELLER PURCHASE NOTIFICATION — created inside this SAME transaction,
      // as the very last write before returning success, so it inherits the
      // whole transaction's own atomicity for free: any abort/rollback
      // anywhere above (own-listing, listing-unavailable, insufficient
      // funds, the defensive item-release backstop) never reaches this line,
      // and if the transaction as a whole fails to commit for any other
      // reason, this insert rolls back right along with every other write
      // here — "no notification on a failed/rolled-back purchase" needs no
      // separate guard, it's the same guarantee every other write in this
      // function already has. Buyer identity is resolved via the same
      // getPlayerIdentitiesByIds primitive marketplace-view.service.ts's own
      // seller/buyer hydration already uses (never a duplicated identity
      // lookup) — a plain read against the shared `prisma` client, not
      // `tx`: the buyer's username is immutable, unrelated data that
      // doesn't need this transaction's own isolation.
      const buyerIdentity = (await getPlayerIdentitiesByIds([buyerId])).get(buyerId);
      const buyerUsername = buyerIdentity?.username ?? buyerIdentity?.displayName ?? "שחקן";

      const soldItems = lockedItems.flatMap(({ itemId, quantity }) => {
        const item = getShopItemById(itemId);
        return item ? [{ name: item.name, quantity }] : [];
      });

      await createNotification(
        tx,
        listing.sellerId,
        "MARKETPLACE_LISTING_SOLD",
        marketplaceSaleNotificationMessage(buyerUsername, soldPokemonNames, soldItems)
      );

      return { status: "success" };
    });
  } catch (error) {
    if (error instanceof PurchaseAbort) {
      return error.result;
    }
    throw error;
  }
}
