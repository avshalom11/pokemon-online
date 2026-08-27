import "server-only";

import { MARKETPLACE_LISTING_BUYABLE_STATUS } from "@/features/marketplace/types/marketplace.types";
import { hydrateOwnedPokemonRows } from "@/features/pokemon/services/player-pokemon";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import type { ShopItem } from "@/features/shop/types/shop.types";
import { getPlayerIdentitiesByIds } from "@/lib/auth/player-profile";
import { prisma } from "@/lib/db/prisma";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

export interface MarketplaceListingItemView {
  item: ShopItem;
  quantity: number;
}

export interface MarketplaceListingView {
  id: string;
  sellerId: string;
  // null only for the (never expected in practice) case where the seller's
  // relation somehow doesn't resolve to a username — same posture
  // PlayerIdentity's own doc comment already documents. Callers must treat
  // this as "no safe profile link", never fall back to any other
  // identifier.
  sellerUsername: string | null;
  sellerDisplayName: string;
  priceMoney: number;
  priceGold: number;
  createdAt: Date;
  pokemon: OwnedPokemon[];
  items: MarketplaceListingItemView[];
}

// Shape returned by prisma.marketplaceListing's own findMany — the one
// piece of shared input every hydration path below (browse, own-editing
// recovery) starts from.
interface RawMarketplaceListing {
  id: string;
  sellerId: string;
  priceMoney: number;
  priceGold: number;
  createdAt: Date;
}

// Shared hydration core for MARKETPLACE PHASE 3 (browse) and PHASE 7
// (own-editing recovery) — both need the exact same seller identity /
// Pokémon / item joins over an arbitrary set of already-fetched listing
// rows, differing only in which `where` selected those rows. Extracted
// here (Phase 7) so neither caller duplicates this join logic; behavior is
// byte-for-byte identical to getActiveMarketplaceListings' own previous
// inline version.
//
// Never uses Prisma's `include` for the child rows — same "compose plain
// queries, resolve relations by hand" convention every other cross-table
// read in this codebase already follows (release-pokemon.service.ts's own
// daycare/battle checks, getAllOwnedPokemon's own daycare exclusion) —
// this project's fake-DB test harness only ever supports flat `where`
// filters, never relational `include`.
async function hydrateMarketplaceListings(listings: RawMarketplaceListing[]): Promise<MarketplaceListingView[]> {
  if (listings.length === 0) return [];

  const listingIds = listings.map((listing) => listing.id);

  const [pokemonLocks, itemRows, sellerIdentities] = await Promise.all([
    prisma.marketplaceListingPokemon.findMany({ where: { listingId: { in: listingIds } } }),
    prisma.marketplaceListingItem.findMany({ where: { listingId: { in: listingIds } } }),
    getPlayerIdentitiesByIds(listings.map((listing) => listing.sellerId)),
  ]);

  const pokemonIds = pokemonLocks.map((lock) => lock.playerPokemonId);
  const pokemonRows = pokemonIds.length > 0 ? await prisma.playerPokemon.findMany({ where: { id: { in: pokemonIds } } }) : [];
  const hydratedPokemonById = new Map(hydrateOwnedPokemonRows(pokemonRows).map((pokemon) => [pokemon.id, pokemon]));

  return listings
    .map((listing): MarketplaceListingView => {
      const identity = sellerIdentities.get(listing.sellerId);

      const pokemon = pokemonLocks
        .filter((lock) => lock.listingId === listing.id)
        .flatMap((lock) => {
          const hydrated = hydratedPokemonById.get(lock.playerPokemonId);
          return hydrated ? [hydrated] : [];
        });

      const items = itemRows
        .filter((row) => row.listingId === listing.id)
        .flatMap((row) => {
          const item = getShopItemById(row.itemId);
          return item ? [{ item, quantity: row.quantity }] : [];
        });

      return {
        id: listing.id,
        sellerId: listing.sellerId,
        sellerUsername: identity?.username ?? null,
        sellerDisplayName: identity?.displayName ?? "שחקן",
        priceMoney: listing.priceMoney,
        priceGold: listing.priceGold,
        createdAt: listing.createdAt,
        pokemon,
        items,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// MARKETPLACE PHASE 3 — the Marketplace browse page's one data source:
// every currently-active listing (never "editing", "sold", or
// "cancelled" — see MarketplaceListingStatus's own doc comment), newest
// first, each fully hydrated for display (seller identity, real Pokémon
// data, real item catalog data).
export async function getActiveMarketplaceListings(): Promise<MarketplaceListingView[]> {
  const listings = await prisma.marketplaceListing.findMany({ where: { status: MARKETPLACE_LISTING_BUYABLE_STATUS } });
  return hydrateMarketplaceListings(listings);
}

// MARKETPLACE PHASE 7 (hardening) — "editing recovery": a listing this
// player themselves started editing (enterEditListingAction) but never
// finished (a refresh/logout/crash before saveEditListingAction or
// cancelEditListingAction ran) is invisible on the browse page (only
// MARKETPLACE_LISTING_BUYABLE_STATUS = "active" is queried there) and its
// own Pokémon/items stay locked with no in-UI way back — this is the one
// data source that surfaces it again so the player can resume or cancel it
// (app/(game)/marketplace/page.tsx -> MarketplaceContent.tsx). Scoped to
// `sellerId` — a player can only ever see (and thus only ever recover)
// their OWN abandoned edits, never another seller's.
export async function getOwnEditingListings(playerId: string): Promise<MarketplaceListingView[]> {
  const listings = await prisma.marketplaceListing.findMany({ where: { sellerId: playerId, status: "editing" } });
  return hydrateMarketplaceListings(listings);
}
