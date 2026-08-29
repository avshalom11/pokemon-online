// TM SYSTEM UI POLISH focused coverage for the "?" info dialog's data
// source — deliberately checks it does NOT apply the same exclusions
// getTmUseCandidates does (already-known moves, Daycare/battle/Marketplace
// locks), since this is a purely informational compatibility view.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getTmInfo } from "./tm-info.service.ts";
import {
  resetFakeDb,
  seedPlayerPokemon,
  seedKnownMove,
  seedDaycareStay,
} from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("an unknown itemId is rejected", async () => {
  const result = await getTmInfo("owner-1", "tm-not-a-real-move");
  assert.deepEqual(result, { status: "invalid-item" });
});

test("returns the move's name/type/power/accuracy alongside the compatible list", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });

  const result = await getTmInfo("owner-1", "tm-thunderbolt");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.moveId, "thunderbolt");
  assert.equal(result.moveName, "Thunderbolt");
  assert.equal(result.moveType, "electric");
  assert.equal(result.moveCategory, "special");
  assert.equal(typeof result.movePower, "number");
  assert.equal(typeof result.moveAccuracy, "number");
});

test("an incompatible Pokémon never appears", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "bulbasaur" });

  const result = await getTmInfo("owner-1", "tm-flamethrower");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.deepEqual(result.compatiblePokemon, []);
});

test("a Pokémon that already knows the move IS still listed, marked alreadyKnowsMove", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "thunderbolt", slot: 1 });

  const result = await getTmInfo("owner-1", "tm-thunderbolt");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.compatiblePokemon.length, 1);
  assert.equal(result.compatiblePokemon[0]?.alreadyKnowsMove, true);
});

test("a Pokémon currently in Daycare IS still listed, never hidden — this is not the TM-use candidate filter", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedDaycareStay({ playerPokemonId: "mon-1", playerId: "owner-1", startingLevel: 5 });

  const result = await getTmInfo("owner-1", "tm-thunderbolt");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.compatiblePokemon.length, 1);
  assert.equal(result.compatiblePokemon[0]?.playerPokemonId, "mon-1");
  assert.equal(result.compatiblePokemon[0]?.unavailableReason, "in-daycare");
});

test("a party Pokémon is included exactly like a storage Pokémon — party membership is never a reason to hide or exclude", async () => {
  seedPlayerPokemon({ id: "mon-party", playerId: "owner-1", speciesId: "pikachu", partySlot: 1 });
  seedPlayerPokemon({ id: "mon-storage", playerId: "owner-1", speciesId: "pikachu", partySlot: null });

  const result = await getTmInfo("owner-1", "tm-thunderbolt");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.deepEqual(
    result.compatiblePokemon.map((p) => p.playerPokemonId).sort(),
    ["mon-party", "mon-storage"]
  );
});

test("only this player's own Pokémon are ever considered", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedPlayerPokemon({ id: "mon-2", playerId: "owner-2", speciesId: "pikachu" });

  const result = await getTmInfo("owner-1", "tm-thunderbolt");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.deepEqual(
    result.compatiblePokemon.map((p) => p.playerPokemonId),
    ["mon-1"]
  );
});

test("no compatible Pokémon at all returns an empty (never throwing) list", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "bulbasaur" });
  seedPlayerPokemon({ id: "mon-2", playerId: "owner-1", speciesId: "squirtle" });

  const result = await getTmInfo("owner-1", "tm-thunderbolt");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.deepEqual(result.compatiblePokemon, []);
});
