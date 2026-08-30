// MARKETPLACE PHASE 2 — focused coverage for createMarketplaceListing:
// validation, atomic asset locking, rollback-on-failure, and the two
// concurrency guarantees this phase's own spec calls out ("two concurrent
// listing attempts must never lock the same Pokémon or more item quantity
// than owned"). Runs the REAL service against the in-memory fake DB.
//
// CONCURRENCY TEST NOTE — the fake DB's own $transaction fully serializes
// concurrent calls (a documented, deliberately conservative approximation —
// see its own doc comment in test/support/fakes/prisma.fake.ts), so a
// "concurrent" pair of calls here never genuinely interleaves; the second
// call's own PASS 1 validation simply already sees the first call's
// committed lock. That still proves the real guarantee this phase cares
// about (never double-locked, never over-locked) — it just means these
// tests exercise pass 1's pre-check rather than pass 2's raw
// unique-constraint/CAS backstop specifically. The backstop's own
// correctness (catch P2002 / a failed CAS -> abort -> rollback) is the same
// idiom already covered elsewhere in this codebase (release-pokemon
// P2002-equivalents, LeagueBattleSession's turnNumber CAS).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { createMarketplaceListing } from "@/features/marketplace/services/create-listing.service";
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

const SELLER_ID = "seller-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: SELLER_ID, level: 5 });
});

test("success: a single Pokémon (currently in party) plus a single item stack, priced in both currencies", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur", partySlot: 3 });
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 10 });

  const result = await createMarketplaceListing(SELLER_ID, {
    playerPokemonIds: ["mon-1"],
    items: [{ itemId: "poke-ball", quantity: 4 }],
    priceMoney: 500,
    priceGold: 10,
  });

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const listing = await prisma.marketplaceListing.findUnique({ where: { id: result.listingId } });
  assert.ok(listing);
  assert.equal(listing?.sellerId, SELLER_ID);
  assert.equal(listing?.status, "active");
  assert.equal(listing?.priceMoney, 500);
  assert.equal(listing?.priceGold, 10);

  // Pokémon stays owned by the seller, just removed from the active party.
  const mon = await prisma.playerPokemon.findUnique({ where: { id: "mon-1" } });
  assert.equal(mon?.playerId, SELLER_ID, "ownership must never change on listing");
  assert.equal(mon?.partySlot, null, "a listed party Pokémon must be cleared from its party slot");

  const lockedPokemon = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-1" } });
  assert.equal(lockedPokemon?.listingId, result.listingId);

  // Item total quantity is unchanged — only lockedQuantity increases.
  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.quantity, 10, "raw quantity must never change on listing");
  assert.equal(item?.lockedQuantity, 4);

  const listingItems = await prisma.marketplaceListingItem.findMany({ where: { listingId: result.listingId } });
  assert.equal(listingItems.length, 1);
  assert.equal(listingItems[0]?.quantity, 4);
});

test("success: multiple Pokémon and multiple item stacks in one listing", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  seedPlayerPokemon({ id: "mon-2", playerId: SELLER_ID, speciesId: "charmander" });
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 5 });
  seedInventoryItem({ playerId: SELLER_ID, itemId: "potion", quantity: 3 });

  const result = await createMarketplaceListing(SELLER_ID, {
    playerPokemonIds: ["mon-1", "mon-2"],
    items: [
      { itemId: "poke-ball", quantity: 2 },
      { itemId: "potion", quantity: 1 },
    ],
    priceMoney: 1000,
  });

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const lockedMon1 = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-1" } });
  const lockedMon2 = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-2" } });
  assert.equal(lockedMon1?.listingId, result.listingId);
  assert.equal(lockedMon2?.listingId, result.listingId);

  const items = await prisma.marketplaceListingItem.findMany({ where: { listingId: result.listingId } });
  assert.equal(items.length, 2);
});

test("success: price in Gold only is valid (Money zero)", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  const result = await createMarketplaceListing(SELLER_ID, { playerPokemonIds: ["mon-1"], priceGold: 25 });
  assert.equal(result.status, "success");
});

test("invalid-input: a listing with no Pokémon and no items is rejected", async () => {
  const result = await createMarketplaceListing(SELLER_ID, { priceMoney: 100 });
  assert.equal(result.status, "invalid-input");
});

test("invalid-input: both prices zero is rejected", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  const result = await createMarketplaceListing(SELLER_ID, { playerPokemonIds: ["mon-1"], priceMoney: 0, priceGold: 0 });
  assert.equal(result.status, "invalid-input");
});

test("invalid-input: the same Pokémon id listed twice in one request is rejected", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  const result = await createMarketplaceListing(SELLER_ID, { playerPokemonIds: ["mon-1", "mon-1"], priceMoney: 100 });
  assert.equal(result.status, "invalid-input");
});

test("invalid-input: the same item id listed twice in one request is rejected", async () => {
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 10 });
  const result = await createMarketplaceListing(SELLER_ID, {
    items: [
      { itemId: "poke-ball", quantity: 1 },
      { itemId: "poke-ball", quantity: 2 },
    ],
    priceMoney: 100,
  });
  assert.equal(result.status, "invalid-input");
});

test("invalid-input: a zero or negative item quantity is rejected", async () => {
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 10 });
  const result = await createMarketplaceListing(SELLER_ID, { items: [{ itemId: "poke-ball", quantity: 0 }], priceMoney: 100 });
  assert.equal(result.status, "invalid-input");
});

test("pokemon-unavailable/is-starter: the original Starter can never be listed", async () => {
  seedPlayerPokemon({ id: "starter-mon", playerId: SELLER_ID, speciesId: "bulbasaur", isStarter: true });
  const result = await createMarketplaceListing(SELLER_ID, { playerPokemonIds: ["starter-mon"], priceMoney: 100 });
  assert.deepEqual(result, { status: "pokemon-unavailable", playerPokemonId: "starter-mon", reason: "is-starter" });
});

test("pokemon-unavailable/in-daycare: a deposited Pokémon can never be listed", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  seedDaycareStay({ playerPokemonId: "mon-1", playerId: SELLER_ID, startingLevel: 5 });
  const result = await createMarketplaceListing(SELLER_ID, { playerPokemonIds: ["mon-1"], priceMoney: 100 });
  assert.deepEqual(result, { status: "pokemon-unavailable", playerPokemonId: "mon-1", reason: "in-daycare" });
});

test("pokemon-unavailable/already-listed: a Pokémon already in another listing can never be listed again", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: "other-listing" });
  const result = await createMarketplaceListing(SELLER_ID, { playerPokemonIds: ["mon-1"], priceMoney: 100 });
  assert.deepEqual(result, { status: "pokemon-unavailable", playerPokemonId: "mon-1", reason: "already-listed" });
});

test("insufficient-item-quantity: requesting more than currently available (raw quantity) is rejected", async () => {
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 3 });
  const result = await createMarketplaceListing(SELLER_ID, { items: [{ itemId: "poke-ball", quantity: 4 }], priceMoney: 100 });
  assert.deepEqual(result, { status: "insufficient-item-quantity", itemId: "poke-ball" });
});

test("insufficient-item-quantity: requesting more than what's left after an existing lock (lockedQuantity) is rejected", async () => {
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 10, lockedQuantity: 8 });
  // Only 2 available; asking for 3 must fail.
  const result = await createMarketplaceListing(SELLER_ID, { items: [{ itemId: "poke-ball", quantity: 3 }], priceMoney: 100 });
  assert.deepEqual(result, { status: "insufficient-item-quantity", itemId: "poke-ball" });

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.lockedQuantity, 8, "a rejected lock attempt must never partially increment lockedQuantity");
});

test("rollback: a mixed request (one valid Pokémon, one invalid item) locks NOTHING — full atomicity", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur", partySlot: 2 });
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 1 });

  const result = await createMarketplaceListing(SELLER_ID, {
    playerPokemonIds: ["mon-1"],
    items: [{ itemId: "poke-ball", quantity: 5 }], // more than the 1 owned
    priceMoney: 100,
  });

  assert.deepEqual(result, { status: "insufficient-item-quantity", itemId: "poke-ball" });

  // Nothing from the same failed attempt may have taken effect.
  const mon = await prisma.playerPokemon.findUnique({ where: { id: "mon-1" } });
  assert.equal(mon?.partySlot, 2, "the Pokémon must stay in its original party slot when the overall listing fails");

  const lockedPokemon = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-1" } });
  assert.equal(lockedPokemon, null, "the Pokémon must not be locked into a listing that failed to create");

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.lockedQuantity, 0);

  const listings = await prisma.marketplaceListing.findMany({ where: { sellerId: SELLER_ID } });
  assert.equal(listings.length, 0, "no listing row may exist after a failed creation attempt");
});

test("rollback: the first Pokémon in a multi-Pokémon request stays untouched when a later Pokémon in the SAME request is unavailable", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur", partySlot: 1 });
  seedPlayerPokemon({ id: "mon-2", playerId: SELLER_ID, speciesId: "charmander", isStarter: true });

  const result = await createMarketplaceListing(SELLER_ID, { playerPokemonIds: ["mon-1", "mon-2"], priceMoney: 100 });

  assert.deepEqual(result, { status: "pokemon-unavailable", playerPokemonId: "mon-2", reason: "is-starter" });

  const mon1 = await prisma.playerPokemon.findUnique({ where: { id: "mon-1" } });
  assert.equal(mon1?.partySlot, 1, "an earlier, valid Pokémon in the same failed request must not be locked or moved");
  const lockedMon1 = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-1" } });
  assert.equal(lockedMon1, null);
});

test("concurrency: two listing attempts for the SAME Pokémon never both succeed", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });

  const [first, second] = await Promise.all([
    createMarketplaceListing(SELLER_ID, { playerPokemonIds: ["mon-1"], priceMoney: 100 }),
    createMarketplaceListing(SELLER_ID, { playerPokemonIds: ["mon-1"], priceGold: 5 }),
  ]);

  const statuses = [first.status, second.status].sort();
  assert.deepEqual(statuses, ["pokemon-unavailable", "success"]);

  const lockedRows = await prisma.marketplaceListingPokemon.findMany({ where: { playerPokemonId: "mon-1" } });
  assert.equal(lockedRows.length, 1, "the Pokémon must end up locked into exactly one listing, never zero or two");
});

test("concurrency: two listing attempts together requesting more item quantity than owned never both succeed", async () => {
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 10 });

  const [first, second] = await Promise.all([
    createMarketplaceListing(SELLER_ID, { items: [{ itemId: "poke-ball", quantity: 6 }], priceMoney: 100 }),
    createMarketplaceListing(SELLER_ID, { items: [{ itemId: "poke-ball", quantity: 6 }], priceGold: 5 }),
  ]);

  const statuses = [first.status, second.status].sort();
  assert.deepEqual(statuses, ["insufficient-item-quantity", "success"]);

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.quantity, 10, "raw quantity must never change from locking alone");
  assert.ok(item!.lockedQuantity <= item!.quantity, "locked quantity must never exceed owned quantity");
  assert.equal(item?.lockedQuantity, 6, "only the winning attempt's quantity may end up locked");
});
