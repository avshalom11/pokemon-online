import "server-only";

import { lockInventoryQuantity, releaseInventoryQuantity } from "@/features/marketplace/services/inventory-lock.service";
import { getPokemonMarketAvailability, type PokemonMarketUnavailableReason } from "@/features/marketplace/services/pokemon-availability.service";
import { createListingSchema, type CreateListingInput } from "@/features/marketplace/validation/create-listing.schema";
import { prisma } from "@/lib/db/prisma";

export type SaveEditListingResult =
  | { status: "success" }
  | { status: "not-owner" }
  | { status: "listing-unavailable" }
  | { status: "invalid-input"; message: string }
  | { status: "pokemon-unavailable"; playerPokemonId: string; reason: PokemonMarketUnavailableReason }
  | { status: "insufficient-item-quantity"; itemId: string };

// Never exported — same "throw to abort a multi-step transaction, never a
// plain early return once something has already been written" idiom every
// other Marketplace mutation service already establishes
// (CreateListingAbort, PurchaseAbort, CancelAbort).
class SaveEditAbort extends Error {
  result: Exclude<SaveEditListingResult, { status: "success" }>;

  constructor(result: Exclude<SaveEditListingResult, { status: "success" }>) {
    super(result.status);
    this.result = result;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

// MARKETPLACE PHASE 6 — saves the seller's own listing while it's in
// "editing" (see enter-edit-listing.service.ts), replacing its Pokémon/item
// contents and price with `input`'s full desired final state (never a
// diff/patch from the caller — the diff against what's CURRENTLY locked is
// computed entirely server-side below). Never trusts `sellerId` from
// anywhere but its own caller, same posture every other mutating service
// in this feature already has.
//
// ONE prisma.$transaction, in two passes exactly like
// create-listing.service.ts's own:
//   PASS 1 (read-only validation):
//     - Re-parse `input` through the SAME createListingSchema
//       create-listing.service.ts uses ("validate same rules as listing
//       creation" — never a second, divergent copy of those rules).
//     - Diff requested Pokémon against this listing's CURRENTLY locked
//       ones. Only the ones being newly ADDED are checked against
//       getPokemonMarketAvailability — a Pokémon already locked in THIS
//       listing is left alone entirely (never re-validated, never
//       touched), which is exactly what makes "this listing's own assets
//       remain selectable while editing" true: getPokemonMarketAvailability
//       would otherwise call an already-locked-by-this-same-listing
//       Pokémon "already-listed" and wrongly reject it.
//     - Diff requested items the same way: for each itemId whose new
//       quantity EXCEEDS what this listing already has locked, only the
//       DELTA is checked against availability — `available = quantity -
//       lockedQuantity` already excludes every OTHER listing's lock (this
//       listing's own lock is already subtracted into `lockedQuantity`),
//       so this delta check is exactly "item availability while editing
//       must include quantity already locked by THIS listing, but never
//       quantities locked elsewhere" without any special-casing needed.
//   PASS 2 (commit): remove locks for anything no longer selected, add
//   locks for anything newly selected, update quantity for anything
//   retained-but-changed, then one final guarded updateMany flips
//   "editing" -> "active" with the new price — the same
//   guarded-updateMany-on-status idiom every other Marketplace mutation
//   uses, so a stale/already-resolved edit session (count 0) throws and
//   rolls back this entire save, keeping the listing as it was.
export async function saveEditListing(sellerId: string, listingId: string, input: CreateListingInput): Promise<SaveEditListingResult> {
  const parsed = createListingSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid-input", message: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  const { playerPokemonIds: newPokemonIds, items: newItems, priceMoney, priceGold } = parsed.data;

  try {
    return await prisma.$transaction(async (tx) => {
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

      const currentPokemonLocks = await tx.marketplaceListingPokemon.findMany({ where: { listingId } });
      const currentPokemonIds = new Set(currentPokemonLocks.map((lock) => lock.playerPokemonId));
      const newPokemonIdSet = new Set(newPokemonIds);

      const pokemonToAdd = newPokemonIds.filter((id) => !currentPokemonIds.has(id));
      const pokemonToRemove = [...currentPokemonIds].filter((id) => !newPokemonIdSet.has(id));

      const currentItemLocks = await tx.marketplaceListingItem.findMany({ where: { listingId } });
      const currentItemQuantities = new Map(currentItemLocks.map((lock) => [lock.itemId, lock.quantity]));
      const newItemQuantities = new Map(newItems.map((item) => [item.itemId, item.quantity]));

      // PASS 1 — validate only what's actually changing.
      for (const playerPokemonId of pokemonToAdd) {
        const availability = await getPokemonMarketAvailability(tx, sellerId, playerPokemonId);
        if (availability.status === "unavailable") {
          throw new SaveEditAbort({ status: "pokemon-unavailable", playerPokemonId, reason: availability.reason });
        }
      }

      for (const [itemId, newQuantity] of newItemQuantities) {
        const currentlyLocked = currentItemQuantities.get(itemId) ?? 0;
        const additionalNeeded = newQuantity - currentlyLocked;
        if (additionalNeeded <= 0) continue;

        const row = await tx.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: sellerId, itemId } } });
        const available = row ? row.quantity - row.lockedQuantity : 0;
        if (available < additionalNeeded) {
          throw new SaveEditAbort({ status: "insufficient-item-quantity", itemId });
        }
      }

      // PASS 2 — commit Pokémon changes.
      if (pokemonToRemove.length > 0) {
        await tx.marketplaceListingPokemon.deleteMany({ where: { listingId, playerPokemonId: { in: pokemonToRemove } } });
      }
      for (const playerPokemonId of pokemonToAdd) {
        try {
          await tx.marketplaceListingPokemon.create({ data: { playerPokemonId, listingId } });
        } catch (error) {
          if (isUniqueConstraintError(error)) {
            throw new SaveEditAbort({ status: "pokemon-unavailable", playerPokemonId, reason: "already-listed" });
          }
          throw error;
        }
        await tx.playerPokemon.update({ where: { id: playerPokemonId }, data: { partySlot: null } });
      }

      // PASS 2 — commit item changes.
      for (const [itemId, currentlyLocked] of currentItemQuantities) {
        if (!newItemQuantities.has(itemId)) {
          const released = await releaseInventoryQuantity(tx, sellerId, itemId, currentlyLocked);
          if (!released) {
            throw new SaveEditAbort({ status: "insufficient-item-quantity", itemId });
          }
          await tx.marketplaceListingItem.deleteMany({ where: { listingId, itemId } });
        }
      }
      for (const [itemId, newQuantity] of newItemQuantities) {
        const currentlyLocked = currentItemQuantities.get(itemId) ?? 0;
        const delta = newQuantity - currentlyLocked;

        if (delta > 0) {
          const locked = await lockInventoryQuantity(tx, sellerId, itemId, delta);
          if (!locked) {
            throw new SaveEditAbort({ status: "insufficient-item-quantity", itemId });
          }
        } else if (delta < 0) {
          const released = await releaseInventoryQuantity(tx, sellerId, itemId, -delta);
          if (!released) {
            throw new SaveEditAbort({ status: "insufficient-item-quantity", itemId });
          }
        }

        if (currentlyLocked === 0) {
          await tx.marketplaceListingItem.create({ data: { listingId, itemId, quantity: newQuantity } });
        } else if (delta !== 0) {
          await tx.marketplaceListingItem.updateMany({ where: { listingId, itemId }, data: { quantity: newQuantity } });
        }
      }

      const saved = await tx.marketplaceListing.updateMany({
        where: { id: listingId, sellerId, status: "editing" },
        data: { status: "active", priceMoney, priceGold },
      });
      if (saved.count === 0) {
        throw new SaveEditAbort({ status: "listing-unavailable" });
      }

      return { status: "success" };
    });
  } catch (error) {
    if (error instanceof SaveEditAbort) {
      return error.result;
    }
    throw error;
  }
}
