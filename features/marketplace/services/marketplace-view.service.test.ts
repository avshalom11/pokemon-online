// MARKETPLACE PHASE 3 — focused coverage for the browse page's one data
// source: only active listings, fully hydrated. Runs the REAL function
// against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getActiveMarketplaceListings, getOwnEditingListings } from "@/features/marketplace/services/marketplace-view.service";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedMarketplaceListing,
  seedMarketplaceListingPokemon,
  seedPlayerPokemon,
  seedPlayerProfile,
  seedUser,
} from "../../../test/support/fakes/prisma.fake.ts";

const SELLER_ID = "seller-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: SELLER_ID, displayName: "מוכר" });
  seedUser({ id: SELLER_ID, username: "seller_one" });
});

test("only active listings are returned — editing/sold/cancelled are excluded", async () => {
  seedMarketplaceListing({ id: "active-1", sellerId: SELLER_ID, status: "active", priceMoney: 100 });
  seedMarketplaceListing({ id: "editing-1", sellerId: SELLER_ID, status: "editing", priceMoney: 100 });
  seedMarketplaceListing({ id: "sold-1", sellerId: SELLER_ID, status: "sold", priceMoney: 100 });
  seedMarketplaceListing({ id: "cancelled-1", sellerId: SELLER_ID, status: "cancelled", priceMoney: 100 });

  const listings = await getActiveMarketplaceListings();
  assert.deepEqual(
    listings.map((l) => l.id),
    ["active-1"]
  );
});

test("a listing's seller, price, Pokémon, and items are all fully hydrated", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur", nickname: "בובי" });
  seedMarketplaceListing({ id: "listing-1", sellerId: SELLER_ID, status: "active", priceMoney: 500, priceGold: 10 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: "listing-1" });
  await prisma.marketplaceListingItem.create({ data: { listingId: "listing-1", itemId: "poke-ball", quantity: 3 } });

  const [listing] = await getActiveMarketplaceListings();
  assert.ok(listing);
  assert.equal(listing.sellerUsername, "seller_one");
  assert.equal(listing.sellerDisplayName, "מוכר");
  assert.equal(listing.priceMoney, 500);
  assert.equal(listing.priceGold, 10);
  assert.equal(listing.pokemon.length, 1);
  assert.equal(listing.pokemon[0]?.id, "mon-1");
  assert.equal(listing.pokemon[0]?.nickname, "בובי");
  assert.equal(listing.items.length, 1);
  assert.equal(listing.items[0]?.item.id, "poke-ball");
  assert.equal(listing.items[0]?.quantity, 3);
});

test("listings never leak into another seller's — each listing's Pokémon/items are scoped to its own id", async () => {
  seedPlayerProfile({ id: "seller-2" });
  seedUser({ id: "seller-2", username: "seller_two" });
  seedPlayerPokemon({ id: "mon-a", playerId: SELLER_ID, speciesId: "bulbasaur" });
  seedPlayerPokemon({ id: "mon-b", playerId: "seller-2", speciesId: "squirtle" });

  seedMarketplaceListing({ id: "listing-a", sellerId: SELLER_ID, status: "active", priceMoney: 100 });
  seedMarketplaceListing({ id: "listing-b", sellerId: "seller-2", status: "active", priceMoney: 200 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-a", listingId: "listing-a" });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-b", listingId: "listing-b" });

  const listings = await getActiveMarketplaceListings();
  const a = listings.find((l) => l.id === "listing-a");
  const b = listings.find((l) => l.id === "listing-b");

  assert.deepEqual(a?.pokemon.map((p) => p.id), ["mon-a"]);
  assert.deepEqual(b?.pokemon.map((p) => p.id), ["mon-b"]);
});

test("no active listings returns an empty array, never throws", async () => {
  const listings = await getActiveMarketplaceListings();
  assert.deepEqual(listings, []);
});

// ===========================================================================
// MARKETPLACE PHASE 7 (hardening) — getOwnEditingListings ("editing
// recovery"): a player's own abandoned mid-edit listings.
// ===========================================================================

test("MARKETPLACE PHASE 7 — getOwnEditingListings returns only this player's own \"editing\" listings, fully hydrated", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur", nickname: "בובי" });
  seedMarketplaceListing({ id: "editing-1", sellerId: SELLER_ID, status: "editing", priceMoney: 250 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: "editing-1" });

  const [listing] = await getOwnEditingListings(SELLER_ID);
  assert.ok(listing);
  assert.equal(listing.id, "editing-1");
  assert.equal(listing.priceMoney, 250);
  assert.equal(listing.pokemon[0]?.id, "mon-1");
});

test("MARKETPLACE PHASE 7 — getOwnEditingListings excludes active/sold/cancelled listings and other sellers' editing listings", async () => {
  seedPlayerProfile({ id: "seller-2" });
  seedUser({ id: "seller-2", username: "seller_two" });

  seedMarketplaceListing({ id: "active-1", sellerId: SELLER_ID, status: "active", priceMoney: 100 });
  seedMarketplaceListing({ id: "sold-1", sellerId: SELLER_ID, status: "sold", priceMoney: 100 });
  seedMarketplaceListing({ id: "cancelled-1", sellerId: SELLER_ID, status: "cancelled", priceMoney: 100 });
  seedMarketplaceListing({ id: "editing-other", sellerId: "seller-2", status: "editing", priceMoney: 100 });

  const listings = await getOwnEditingListings(SELLER_ID);
  assert.deepEqual(listings, []);
});

test("MARKETPLACE PHASE 7 — a player with no editing listings gets an empty array, never throws", async () => {
  const listings = await getOwnEditingListings(SELLER_ID);
  assert.deepEqual(listings, []);
});
