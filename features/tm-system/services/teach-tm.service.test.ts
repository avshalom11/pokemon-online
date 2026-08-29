// TM SYSTEM PHASE 4 focused coverage for the server/domain teach-TM flow —
// one test per rule that would silently break the feature (successful add,
// successful replace, incompatibility, duplicate move, missing TM,
// locked/unavailable Pokémon, pending-move-learning resolution, and
// no-consume-on-failure), not exhaustive coverage of the whole catalog.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { teachTm } from "./teach-tm.service.ts";
import {
  resetFakeDb,
  seedPlayerPokemon,
  seedKnownMove,
  seedInventoryItem,
  seedPendingMove,
  seedDaycareStay,
  seedMarketplaceListing,
  seedMarketplaceListingPokemon,
  seedFieldBattleSession,
  getPlayerPokemonRow,
  getInventoryItemRow,
  getKnownMovesFor,
  getPendingRecord,
} from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

// Real, verified compatibility facts from the TM SYSTEM PHASE 3 dataset
// (engine/tm-compatibility): Pikachu (Electric) IS machine-compatible with
// Thunderbolt; Bulbasaur (Grass/Poison) is NEVER machine-compatible with
// Flamethrower. Reused across tests below rather than re-derived per test.

test("successful add: a Pokémon with room simply learns the move and exactly one TM is consumed", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "tackle", slot: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-thunderbolt", quantity: 2 });

  const result = await teachTm("owner-1", "mon-1", "tm-thunderbolt");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.mode, "added");
  assert.equal(result.moveId, "thunderbolt");
  assert.equal(result.remainingTmQuantity, 1);
  assert.equal(result.declinedPendingMoveLearning, false);

  assert.deepEqual(getKnownMovesFor("mon-1"), [
    { moveId: "tackle", slot: 1 },
    { moveId: "thunderbolt", slot: 2 },
  ]);
  assert.equal(getInventoryItemRow("owner-1", "tm-thunderbolt")?.quantity, 1);
});

test("successful replace: a Pokémon with 4 known moves replaces exactly the caller-selected slot", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "tackle", slot: 1 });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "growl", slot: 2 });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "quick-attack", slot: 3 });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "agility", slot: 4 });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-thunderbolt", quantity: 1 });

  const result = await teachTm("owner-1", "mon-1", "tm-thunderbolt", 2);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.mode, "replaced");
  assert.equal(result.remainingTmQuantity, 0);

  assert.deepEqual(getKnownMovesFor("mon-1"), [
    { moveId: "tackle", slot: 1 },
    { moveId: "thunderbolt", slot: 2 },
    { moveId: "quick-attack", slot: 3 },
    { moveId: "agility", slot: 4 },
  ]);
});

test("a Pokémon with 4 known moves and no chosen slot is rejected — never guesses which move to forget", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "tackle", slot: 1 });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "growl", slot: 2 });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "quick-attack", slot: 3 });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "agility", slot: 4 });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-thunderbolt", quantity: 1 });

  const result = await teachTm("owner-1", "mon-1", "tm-thunderbolt");

  assert.equal(result.status, "forget-slot-required");
  assert.equal(getKnownMovesFor("mon-1").length, 4, "no slot was touched");
  assert.equal(getInventoryItemRow("owner-1", "tm-thunderbolt")?.quantity, 1, "no TM consumed");
});

test("incompatible Pokémon: rejected even though the move exists and the item is owned", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "bulbasaur" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "tackle", slot: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-flamethrower", quantity: 1 });

  const result = await teachTm("owner-1", "mon-1", "tm-flamethrower");

  assert.equal(result.status, "incompatible");
  assert.deepEqual(getKnownMovesFor("mon-1"), [{ moveId: "tackle", slot: 1 }]);
  assert.equal(getInventoryItemRow("owner-1", "tm-flamethrower")?.quantity, 1, "no TM consumed");
});

test("duplicate move: rejected when the Pokémon already knows the move, and no TM is consumed", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "thunderbolt", slot: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-thunderbolt", quantity: 1 });

  const result = await teachTm("owner-1", "mon-1", "tm-thunderbolt");

  assert.equal(result.status, "already-known");
  assert.deepEqual(getKnownMovesFor("mon-1"), [{ moveId: "thunderbolt", slot: 1 }]);
  assert.equal(getInventoryItemRow("owner-1", "tm-thunderbolt")?.quantity, 1, "no TM consumed");
});

test("missing TM: an unknown itemId is rejected up front, before any DB read", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });

  const result = await teachTm("owner-1", "mon-1", "tm-not-a-real-move");

  assert.equal(result.status, "invalid-item");
});

test("missing TM: owning zero of the required TM is rejected, and the known-move write is rolled back entirely", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "tackle", slot: 1 });
  // No tm-thunderbolt inventory row seeded at all — the player owns none.

  const result = await teachTm("owner-1", "mon-1", "tm-thunderbolt");

  assert.equal(result.status, "insufficient-tm");
  assert.deepEqual(
    getKnownMovesFor("mon-1"),
    [{ moveId: "tackle", slot: 1 }],
    "the known-move mutation that already ran earlier in this same transaction must be rolled back, not left applied"
  );
});

test("locked/unavailable Pokémon: blocked while in Daycare", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "tackle", slot: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-thunderbolt", quantity: 1 });
  seedDaycareStay({ playerPokemonId: "mon-1", playerId: "owner-1", startingLevel: 5 });

  const result = await teachTm("owner-1", "mon-1", "tm-thunderbolt");

  assert.deepEqual(result, { status: "unavailable", reason: "in-daycare" });
  assert.equal(getInventoryItemRow("owner-1", "tm-thunderbolt")?.quantity, 1);
  assert.deepEqual(getKnownMovesFor("mon-1"), [{ moveId: "tackle", slot: 1 }]);
});

test("locked/unavailable Pokémon: blocked while locked in an active Marketplace listing", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "tackle", slot: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-thunderbolt", quantity: 1 });
  const listing = seedMarketplaceListing({ sellerId: "owner-1" });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });

  const result = await teachTm("owner-1", "mon-1", "tm-thunderbolt");

  assert.deepEqual(result, { status: "unavailable", reason: "already-listed" });
  assert.deepEqual(getKnownMovesFor("mon-1"), [{ moveId: "tackle", slot: 1 }]);
});

test("locked/unavailable Pokémon: blocked while active in a field battle", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "tackle", slot: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-thunderbolt", quantity: 1 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: "grassland",
    wildSpeciesId: "rattata",
    wildLevel: 5,
    wildCurrentHp: 20,
    wildMaxHp: 20,
    activePlayerPokemonId: "mon-1",
  });

  const result = await teachTm("owner-1", "mon-1", "tm-thunderbolt");

  assert.deepEqual(result, { status: "unavailable", reason: "in-field-battle" });
  assert.deepEqual(getKnownMovesFor("mon-1"), [{ moveId: "tackle", slot: 1 }]);
});

test("pending same-move handling: teaching a TM resolves (declines) an unresolved pending level-up learn for the exact same move, and no other", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "tackle", slot: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-thunderbolt", quantity: 1 });
  const samePending = seedPendingMove({ playerPokemonId: "mon-1", moveId: "thunderbolt", learnedAtLevel: 26 });
  const otherPending = seedPendingMove({ playerPokemonId: "mon-1", moveId: "iron-tail", learnedAtLevel: 30 });

  const result = await teachTm("owner-1", "mon-1", "tm-thunderbolt");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.declinedPendingMoveLearning, true);

  const resolvedSame = getPendingRecord(samePending.id);
  assert.equal(resolvedSame?.status, "declined");
  assert.notEqual(resolvedSame?.resolvedAt, null);

  const untouchedOther = getPendingRecord(otherPending.id);
  assert.equal(untouchedOther?.status, "pending", "a pending learn for a DIFFERENT move must never be touched");
  assert.equal(untouchedOther?.resolvedAt, null);
});

test("no-consume-on-failure: across every rejection path, the TM quantity never changes", async () => {
  seedPlayerPokemon({ id: "mon-incompatible", playerId: "owner-1", speciesId: "bulbasaur" });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-flamethrower", quantity: 3 });
  await teachTm("owner-1", "mon-incompatible", "tm-flamethrower");
  assert.equal(getInventoryItemRow("owner-1", "tm-flamethrower")?.quantity, 3);

  seedPlayerPokemon({ id: "mon-duplicate", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-duplicate", moveId: "thunderbolt", slot: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "tm-thunderbolt", quantity: 3 });
  await teachTm("owner-1", "mon-duplicate", "tm-thunderbolt");
  assert.equal(getInventoryItemRow("owner-1", "tm-thunderbolt")?.quantity, 3);

  seedPlayerPokemon({ id: "mon-daycare", playerId: "owner-1", speciesId: "pikachu" });
  seedDaycareStay({ playerPokemonId: "mon-daycare", playerId: "owner-1", startingLevel: 5 });
  await teachTm("owner-1", "mon-daycare", "tm-thunderbolt");
  assert.equal(getInventoryItemRow("owner-1", "tm-thunderbolt")?.quantity, 3);

  // Pikachu IS verified-compatible with Thunder (unlike Hyper Beam), so this
  // exercises the insufficient-tm path specifically — never seeded owner-1
  // any "tm-thunder" inventory at all.
  seedPlayerPokemon({ id: "mon-broke", playerId: "owner-1", speciesId: "pikachu" });
  const result = await teachTm("owner-1", "mon-broke", "tm-thunder");
  assert.equal(result.status, "insufficient-tm");
  assert.equal(getInventoryItemRow("owner-1", "tm-thunder"), undefined, "still never created/consumed");
  assert.equal(getPlayerPokemonRow("mon-broke")?.speciesId, "pikachu", "the Pokémon row itself is otherwise untouched");
});
