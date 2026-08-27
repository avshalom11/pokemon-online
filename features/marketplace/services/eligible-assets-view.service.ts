import "server-only";

import { getAvailableQuantity } from "@/features/marketplace/services/inventory-availability.service";
import { getPokemonMarketAvailability } from "@/features/marketplace/services/pokemon-availability.service";
import { getAllOwnedPokemon } from "@/features/pokemon/services/player-pokemon";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import type { ShopItem } from "@/features/shop/types/shop.types";
import { prisma } from "@/lib/db/prisma";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

export interface EligibleMarketplaceItem {
  item: ShopItem;
  // quantity - lockedQuantity — the most this player could still list of
  // this item right now (see getAvailableQuantity's own doc comment).
  // Never raw `quantity`: an item already partly committed to another
  // listing must not be offered again beyond what's actually free.
  availableQuantity: number;
}

// MARKETPLACE PHASE 3 — the create-listing UI's own "what can this seller
// actually pick" data source. Every owned Pokémon that ALSO passes
// getPokemonMarketAvailability: excludes the Starter, a Pokémon in
// Daycare (getAllOwnedPokemon already excludes those — see its own doc
// comment) or an active field/gym/league battle, and anything already
// locked into another listing. Party membership is NOT a reason to
// exclude here — see getPokemonMarketAvailability's own doc comment; a
// party Pokémon is still pickable, and create-listing.service.ts is what
// actually clears its partySlot once chosen.
export async function getEligibleMarketplacePokemon(playerId: string): Promise<OwnedPokemon[]> {
  const owned = await getAllOwnedPokemon(playerId);

  const checked = await Promise.all(
    owned.map(async (pokemon) => ({
      pokemon,
      availability: await getPokemonMarketAvailability(prisma, playerId, pokemon.id),
    }))
  );

  return checked.filter((entry) => entry.availability.status === "available").map((entry) => entry.pokemon);
}

// Every PlayerInventoryItem row with availableQuantity > 0, hydrated
// against the static Shop catalog exactly like inventory-view.service.ts's
// own getInventoryView (never a duplicated item definition) — deliberately
// its own query here rather than reusing getOwnedInventoryItems, which
// only returns raw quantity (no lockedQuantity) and is shared by many
// non-Marketplace callers this feature must not risk changing the shape
// of. Eggs/Incubators are never returned here — they're never rows in
// PlayerInventoryItem at all (see that model's own schema doc comment), so
// excluding them needs no extra filter.
export async function getEligibleMarketplaceItems(playerId: string): Promise<EligibleMarketplaceItem[]> {
  const rows = await prisma.playerInventoryItem.findMany({ where: { playerId, quantity: { gt: 0 } } });

  const eligible: EligibleMarketplaceItem[] = [];
  for (const row of rows) {
    const availableQuantity = getAvailableQuantity(row);
    if (availableQuantity <= 0) continue;

    const item = getShopItemById(row.itemId);
    if (!item) continue;

    eligible.push({ item, availableQuantity });
  }

  return eligible;
}

// MARKETPLACE PHASE 6 — the edit-listing UI's own "what can this seller
// pick" data source: identical to getEligibleMarketplacePokemon above,
// EXCEPT a Pokémon currently locked into THIS SAME listing is always
// included regardless of what getPokemonMarketAvailability would say. That
// function's own "already-listed" check has no way to know "locked by the
// very listing being edited" is fine — this is the one place that
// distinction is made, satisfying this phase's own "current listing's own
// assets must remain selectable while editing" rule without weakening
// getPokemonMarketAvailability's own general-purpose check for every other
// caller.
export async function getEligibleMarketplacePokemonForEdit(playerId: string, listingId: string): Promise<OwnedPokemon[]> {
  const [owned, currentLocks] = await Promise.all([
    getAllOwnedPokemon(playerId),
    prisma.marketplaceListingPokemon.findMany({ where: { listingId } }),
  ]);
  const lockedByThisListing = new Set(currentLocks.map((lock) => lock.playerPokemonId));

  const checked = await Promise.all(
    owned.map(async (pokemon) => {
      if (lockedByThisListing.has(pokemon.id)) return { pokemon, isEligible: true };
      const availability = await getPokemonMarketAvailability(prisma, playerId, pokemon.id);
      return { pokemon, isEligible: availability.status === "available" };
    })
  );

  return checked.filter((entry) => entry.isEligible).map((entry) => entry.pokemon);
}

// MARKETPLACE PHASE 6 — the edit-listing UI's own item counterpart: same
// availableQuantity as getEligibleMarketplaceItems above, PLUS whatever
// quantity THIS listing already has locked — "item availability while
// editing must include quantity already locked by THIS listing, but never
// quantities locked elsewhere" is exactly `quantity - lockedQuantity +
// ownListingLock`, since `lockedQuantity` already includes this listing's
// own contribution (subtracting it back out via getAvailableQuantity, then
// adding it back, is what isolates "locked by OTHERS" from the total).
export async function getEligibleMarketplaceItemsForEdit(playerId: string, listingId: string): Promise<EligibleMarketplaceItem[]> {
  const [rows, currentLocks] = await Promise.all([
    prisma.playerInventoryItem.findMany({ where: { playerId, quantity: { gt: 0 } } }),
    prisma.marketplaceListingItem.findMany({ where: { listingId } }),
  ]);
  const lockedByThisListing = new Map(currentLocks.map((lock) => [lock.itemId, lock.quantity]));

  const eligible: EligibleMarketplaceItem[] = [];
  for (const row of rows) {
    const ownLock = lockedByThisListing.get(row.itemId) ?? 0;
    const availableQuantity = getAvailableQuantity(row) + ownLock;
    if (availableQuantity <= 0) continue;

    const item = getShopItemById(row.itemId);
    if (!item) continue;

    eligible.push({ item, availableQuantity });
  }

  return eligible;
}
