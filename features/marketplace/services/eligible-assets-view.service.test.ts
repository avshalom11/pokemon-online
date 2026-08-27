// MARKETPLACE PHASE 3 — focused coverage for the create-listing UI's own
// "what can this seller actually pick" data source. Runs the REAL
// functions against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  getEligibleMarketplaceItems,
  getEligibleMarketplaceItemsForEdit,
  getEligibleMarketplacePokemon,
  getEligibleMarketplacePokemonForEdit,
} from "@/features/marketplace/services/eligible-assets-view.service";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedDaycareStay,
  seedInventoryItem,
  seedMarketplaceListing,
  seedMarketplaceListingPokemon,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID });
});

test("getEligibleMarketplacePokemon: a plain owned Pokémon, including one in the active party, is eligible", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: PLAYER_ID, speciesId: "bulbasaur" });
  seedPlayerPokemon({ id: "mon-2", playerId: PLAYER_ID, speciesId: "charmander", partySlot: 1 });

  const eligible = await getEligibleMarketplacePokemon(PLAYER_ID);
  assert.deepEqual(
    eligible.map((p) => p.id).sort(),
    ["mon-1", "mon-2"]
  );
});

test("getEligibleMarketplacePokemon: excludes the Starter", async () => {
  seedPlayerPokemon({ id: "starter-mon", playerId: PLAYER_ID, speciesId: "bulbasaur", isStarter: true });
  seedPlayerPokemon({ id: "mon-1", playerId: PLAYER_ID, speciesId: "charmander" });

  const eligible = await getEligibleMarketplacePokemon(PLAYER_ID);
  assert.deepEqual(
    eligible.map((p) => p.id),
    ["mon-1"]
  );
});

test("getEligibleMarketplacePokemon: excludes a Pokémon currently in Daycare", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: PLAYER_ID, speciesId: "bulbasaur" });
  seedPlayerPokemon({ id: "mon-2", playerId: PLAYER_ID, speciesId: "charmander" });
  seedDaycareStay({ playerPokemonId: "mon-2", playerId: PLAYER_ID, startingLevel: 5 });

  const eligible = await getEligibleMarketplacePokemon(PLAYER_ID);
  assert.deepEqual(
    eligible.map((p) => p.id),
    ["mon-1"]
  );
});

test("getEligibleMarketplacePokemon: excludes a Pokémon already locked into another listing", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: PLAYER_ID, speciesId: "bulbasaur" });
  seedPlayerPokemon({ id: "mon-2", playerId: PLAYER_ID, speciesId: "charmander" });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-2", listingId: "other-listing" });

  const eligible = await getEligibleMarketplacePokemon(PLAYER_ID);
  assert.deepEqual(
    eligible.map((p) => p.id),
    ["mon-1"]
  );
});

test("getEligibleMarketplaceItems: an unlocked stack is fully eligible", async () => {
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "poke-ball", quantity: 10 });

  const eligible = await getEligibleMarketplaceItems(PLAYER_ID);
  assert.equal(eligible.length, 1);
  assert.equal(eligible[0]?.item.id, "poke-ball");
  assert.equal(eligible[0]?.availableQuantity, 10);
});

test("getEligibleMarketplaceItems: availableQuantity subtracts lockedQuantity", async () => {
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "poke-ball", quantity: 10, lockedQuantity: 6 });

  const eligible = await getEligibleMarketplaceItems(PLAYER_ID);
  assert.equal(eligible[0]?.availableQuantity, 4);
});

test("getEligibleMarketplaceItems: a fully-locked stack is excluded entirely (never offered at 0)", async () => {
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "poke-ball", quantity: 5, lockedQuantity: 5 });

  const eligible = await getEligibleMarketplaceItems(PLAYER_ID);
  assert.deepEqual(eligible, []);
});

test("getEligibleMarketplaceItems: an item id that no longer resolves in the Shop catalog is skipped, never crashes", async () => {
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "not-a-real-item", quantity: 3 });

  const eligible = await getEligibleMarketplaceItems(PLAYER_ID);
  assert.deepEqual(eligible, []);
});

test("getEligibleMarketplaceItems: Eggs/Incubators never appear — they are never rows in PlayerInventoryItem at all", async () => {
  await prisma.playerOwnedEgg.create({ data: { playerId: PLAYER_ID, rarity: "common", regionId: "kanto" } });

  const eligible = await getEligibleMarketplaceItems(PLAYER_ID);
  assert.deepEqual(eligible, []);
});

// MARKETPLACE PHASE 6 — the edit-listing UI's own eligibility variants:
// same rules as create, PLUS this one listing's own current locks must
// remain selectable.
test("getEligibleMarketplacePokemonForEdit: a Pokémon locked into THIS listing remains selectable, unlike the create variant", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: PLAYER_ID, speciesId: "bulbasaur" });
  const listing = seedMarketplaceListing({ sellerId: PLAYER_ID, status: "editing", priceMoney: 100 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });

  const createEligible = await getEligibleMarketplacePokemon(PLAYER_ID);
  assert.deepEqual(createEligible, [], "the create variant must exclude it — it's already-listed");

  const editEligible = await getEligibleMarketplacePokemonForEdit(PLAYER_ID, listing.id);
  assert.deepEqual(
    editEligible.map((p) => p.id),
    ["mon-1"],
    "the edit variant must still offer this listing's own current Pokémon"
  );
});

test("getEligibleMarketplacePokemonForEdit: a Pokémon locked into a DIFFERENT listing stays excluded", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: PLAYER_ID, speciesId: "bulbasaur" });
  seedPlayerPokemon({ id: "mon-2", playerId: PLAYER_ID, speciesId: "charmander" });
  const thisListing = seedMarketplaceListing({ sellerId: PLAYER_ID, status: "editing", priceMoney: 100 });
  const otherListing = seedMarketplaceListing({ sellerId: PLAYER_ID, status: "active", priceMoney: 50 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-2", listingId: otherListing.id });

  const editEligible = await getEligibleMarketplacePokemonForEdit(PLAYER_ID, thisListing.id);
  assert.deepEqual(
    editEligible.map((p) => p.id),
    ["mon-1"],
    "mon-2 is locked elsewhere and must never be offered while editing a different listing"
  );
});

test("getEligibleMarketplaceItemsForEdit: availableQuantity includes THIS listing's own lock but not other listings'", async () => {
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "poke-ball", quantity: 10, lockedQuantity: 7 });
  const thisListing = seedMarketplaceListing({ sellerId: PLAYER_ID, status: "editing", priceMoney: 100 });
  const otherListing = seedMarketplaceListing({ sellerId: PLAYER_ID, status: "active", priceMoney: 50 });
  await prisma.marketplaceListingItem.create({ data: { listingId: thisListing.id, itemId: "poke-ball", quantity: 4 } });
  await prisma.marketplaceListingItem.create({ data: { listingId: otherListing.id, itemId: "poke-ball", quantity: 3 } });

  const createEligible = await getEligibleMarketplaceItems(PLAYER_ID);
  assert.equal(createEligible[0]?.availableQuantity, 3, "create variant: 10 - 7 locked = 3 available");

  const editEligible = await getEligibleMarketplaceItemsForEdit(PLAYER_ID, thisListing.id);
  assert.equal(
    editEligible[0]?.availableQuantity,
    7,
    "edit variant: 3 (create-available) + 4 (this listing's own lock) = 7 — the other listing's 3 stay excluded"
  );
});
