// Phase 5A regression tests for the battle view's Known Move resolution —
// PlayerPokemon -> Known Moves -> Move Registry (see
// battle-view.service.ts's resolveKnownMoveSlots and its own doc comment).
// Runs the REAL function unmodified; "@/lib/db/prisma" is redirected to an
// in-memory fake by test/support/alias-loader.mjs, for the same reasons as
// every other persistence test in this project (see
// ../../move-learning/move-learning-service.persistence.test.ts).
//
// Run via `npm test` (wires up the alias loader).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { resolveKnownMoveSlots } from "@/features/battle/services/battle-view.service";
import { resetFakeDb, seedPlayerPokemon, seedKnownMove } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("resolves a single known move against the Move Registry, preserving its slot", async () => {
  seedPlayerPokemon({ id: "p1", playerId: "owner-1" });
  seedKnownMove({ playerPokemonId: "p1", moveId: "tackle", slot: 1 });

  const slots = await resolveKnownMoveSlots("p1");

  assert.equal(slots.length, 1);
  assert.equal(slots[0].slot, 1);
  assert.equal(slots[0].moveId, "tackle");
  assert.equal(slots[0].name, "Tackle");
  assert.equal(typeof slots[0].type, "string");
  assert.equal(typeof slots[0].category, "string");
});

test("resolves two known moves, both present and correctly slotted", async () => {
  seedPlayerPokemon({ id: "p1", playerId: "owner-1" });
  seedKnownMove({ playerPokemonId: "p1", moveId: "tackle", slot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 2 });

  const slots = await resolveKnownMoveSlots("p1");

  assert.deepEqual(
    slots.map((slot) => [slot.slot, slot.moveId]),
    [
      [1, "tackle"],
      [2, "growl"],
    ]
  );
});

test("resolves four known moves, all present and correctly slotted", async () => {
  seedPlayerPokemon({ id: "p1", playerId: "owner-1" });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 2 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "ember", slot: 3 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "smokescreen", slot: 4 });

  const slots = await resolveKnownMoveSlots("p1");

  assert.deepEqual(
    slots.map((slot) => slot.slot),
    [1, 2, 3, 4]
  );
  assert.deepEqual(
    slots.map((slot) => slot.moveId),
    ["growl", "scratch", "ember", "smokescreen"]
  );
});

test("slot order is preserved even when the underlying rows are seeded out of order", async () => {
  seedPlayerPokemon({ id: "p1", playerId: "owner-1" });
  seedKnownMove({ playerPokemonId: "p1", moveId: "ember", slot: 3 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 2 });

  const slots = await resolveKnownMoveSlots("p1");

  assert.deepEqual(
    slots.map((slot) => slot.moveId),
    ["growl", "scratch", "ember"]
  );
});

test("a Pokémon's Known Moves never leak into another Pokémon's resolved slots", async () => {
  seedPlayerPokemon({ id: "p1", playerId: "owner-1" });
  seedPlayerPokemon({ id: "p2", playerId: "owner-1" });
  seedKnownMove({ playerPokemonId: "p1", moveId: "tackle", slot: 1 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "growl", slot: 1 });

  const p1Slots = await resolveKnownMoveSlots("p1");
  const p2Slots = await resolveKnownMoveSlots("p2");

  assert.deepEqual(p1Slots.map((slot) => slot.moveId), ["tackle"]);
  assert.deepEqual(p2Slots.map((slot) => slot.moveId), ["growl"]);
});
