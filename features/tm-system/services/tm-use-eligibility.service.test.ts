// TM SYSTEM PHASE 5 focused coverage for the Inventory "use this TM"
// eligibility view — one test per rule that decides whether a Pokémon
// appears in the panel at all.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getTmUseCandidates } from "./tm-use-eligibility.service.ts";
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
  const result = await getTmUseCandidates("owner-1", "tm-not-a-real-move");
  assert.deepEqual(result, { status: "invalid-item" });
});

test("a compatible Pokémon with room appears, with hasRoom true and its current moves listed", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu", level: 12 });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "tackle", slot: 1 });

  const result = await getTmUseCandidates("owner-1", "tm-thunderbolt");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.moveId, "thunderbolt");
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]?.playerPokemonId, "mon-1");
  assert.equal(result.candidates[0]?.hasRoom, true);
  assert.deepEqual(result.candidates[0]?.knownMoves.map((m) => m.moveId), ["tackle"]);
});

test("an incompatible Pokémon never appears, even though the move and item both exist", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "bulbasaur" });

  const result = await getTmUseCandidates("owner-1", "tm-flamethrower");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.deepEqual(result.candidates, []);
});

test("a Pokémon that already knows the move never appears", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "thunderbolt", slot: 1 });

  const result = await getTmUseCandidates("owner-1", "tm-thunderbolt");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.deepEqual(result.candidates, []);
});

test("a Pokémon currently in Daycare never appears", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedDaycareStay({ playerPokemonId: "mon-1", playerId: "owner-1", startingLevel: 5 });

  const result = await getTmUseCandidates("owner-1", "tm-thunderbolt");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.deepEqual(result.candidates, []);
});

test("a Pokémon with 4 known moves appears with hasRoom false and all 4 moves listed in slot order", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "agility", slot: 4 });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "tackle", slot: 1 });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "growl", slot: 2 });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "quick-attack", slot: 3 });

  const result = await getTmUseCandidates("owner-1", "tm-thunderbolt");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]?.hasRoom, false);
  assert.deepEqual(
    result.candidates[0]?.knownMoves.map((m) => m.slot),
    [1, 2, 3, 4]
  );
});

test("only this player's own Pokémon are ever considered", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });
  seedPlayerPokemon({ id: "mon-2", playerId: "owner-2", speciesId: "pikachu" });

  const result = await getTmUseCandidates("owner-1", "tm-thunderbolt");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.deepEqual(
    result.candidates.map((c) => c.playerPokemonId),
    ["mon-1"]
  );
});
