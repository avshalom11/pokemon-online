import "server-only";

import { lockInventoryQuantity } from "@/features/marketplace/services/inventory-lock.service";
import { getPokemonMarketAvailability, type PokemonMarketUnavailableReason } from "@/features/marketplace/services/pokemon-availability.service";
import { createListingSchema, type CreateListingInput } from "@/features/marketplace/validation/create-listing.schema";
import { prisma } from "@/lib/db/prisma";

export type CreateListingResult =
  | { status: "success"; listingId: string }
  | { status: "invalid-input"; message: string }
  | { status: "pokemon-unavailable"; playerPokemonId: string; reason: PokemonMarketUnavailableReason }
  | { status: "insufficient-item-quantity"; itemId: string };

// Never exported — a pure internal control-flow signal thrown from inside
// the one prisma.$transaction below to abort it (rolling back every write
// already made in THIS attempt) and carry a typed, user-facing result out
// to the catch block. A plain early `return` from inside a transaction
// callback would instead COMMIT whatever partial writes already
// happened — see this function's own doc comment for why that matters once
// a listing has more than one asset.
class CreateListingAbort extends Error {
  result: Exclude<CreateListingResult, { status: "success" }>;

  constructor(result: Exclude<CreateListingResult, { status: "success" }>) {
    super(result.status);
    this.result = result;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

// MARKETPLACE PHASE 2 — creates one listing bundling zero-or-more Pokémon
// and zero-or-more stackable item stacks, atomically. Never trusts
// `sellerId` from anywhere but its own caller (features/marketplace/actions/
// create-listing.action.ts resolves it from the authenticated session) —
// this function itself takes it as a plain parameter, same posture every
// other mutating service in this codebase already has.
//
// ONE prisma.$transaction end to end, in two passes:
//   1. VALIDATE (read-only) — every Pokémon's market availability
//      (getPokemonMarketAvailability) and every item's currently available
//      quantity, using THIS transaction's own client so every check sees
//      one consistent snapshot. The first failing asset aborts the whole
//      attempt via CreateListingAbort before anything is written.
//   2. COMMIT (writes) — create the listing row, then for each Pokémon:
//      lock it (MarketplaceListingPokemon.playerPokemonId is that table's
//      own @id — a second lock attempt for the same Pokémon is a real
//      primary-key collision, the race-safe backstop behind pass 1's
//      already-listed pre-check, same "app check for a clean rejection,
//      DB constraint as the real backstop" idiom release-pokemon.service.ts
//      and PlayerDaycareStay already establish) and clear its partySlot;
//      then for each item, lockInventoryQuantity (its own
//      compare-and-swap guard is the race-safe backstop behind pass 1's
//      already-read availability).
//
// Two concurrent create-listing calls that both try to lock the same
// Pokémon or overlapping item quantity can therefore never both win: one
// commits, the other hits a real constraint/CAS failure in pass 2, throws,
// and rolls back cleanly with nothing partially locked.
export async function createMarketplaceListing(sellerId: string, input: CreateListingInput): Promise<CreateListingResult> {
  const parsed = createListingSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid-input", message: parsed.error.issues[0]?.message ?? "קלט לא תקין" };
  }

  const { playerPokemonIds, items, priceMoney, priceGold } = parsed.data;

  try {
    const listingId = await prisma.$transaction(async (tx) => {
      // PASS 1 — validate every asset before writing anything.
      for (const playerPokemonId of playerPokemonIds) {
        const availability = await getPokemonMarketAvailability(tx, sellerId, playerPokemonId);
        if (availability.status === "unavailable") {
          throw new CreateListingAbort({ status: "pokemon-unavailable", playerPokemonId, reason: availability.reason });
        }
      }

      for (const { itemId, quantity } of items) {
        const row = await tx.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: sellerId, itemId } } });
        const available = row ? row.quantity - row.lockedQuantity : 0;
        if (available < quantity) {
          throw new CreateListingAbort({ status: "insufficient-item-quantity", itemId });
        }
      }

      // PASS 2 — commit: create the listing, then lock each asset into it.
      const listing = await tx.marketplaceListing.create({
        data: { sellerId, priceMoney, priceGold },
      });

      for (const playerPokemonId of playerPokemonIds) {
        try {
          await tx.marketplaceListingPokemon.create({ data: { playerPokemonId, listingId: listing.id } });
        } catch (error) {
          if (isUniqueConstraintError(error)) {
            throw new CreateListingAbort({ status: "pokemon-unavailable", playerPokemonId, reason: "already-listed" });
          }
          throw error;
        }

        // Listed party Pokémon get partySlot = null — a harmless no-op for
        // one already in storage (partySlot already null).
        await tx.playerPokemon.update({ where: { id: playerPokemonId }, data: { partySlot: null } });
      }

      for (const { itemId, quantity } of items) {
        const locked = await lockInventoryQuantity(tx, sellerId, itemId, quantity);
        if (!locked) {
          throw new CreateListingAbort({ status: "insufficient-item-quantity", itemId });
        }
        await tx.marketplaceListingItem.create({ data: { listingId: listing.id, itemId, quantity } });
      }

      return listing.id;
    });

    return { status: "success", listingId };
  } catch (error) {
    if (error instanceof CreateListingAbort) {
      return error.result;
    }
    throw error;
  }
}
