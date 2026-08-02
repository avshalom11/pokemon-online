// Focused regression tests for accepting a STONE evolution from the
// Inventory — deliberately small (per this phase's own "essential tests
// only" instruction): one test per rule that would silently break the
// feature, not exhaustive coverage of the whole species roster.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { acceptStoneEvolution } from "./accept-stone-evolution.service.ts";
import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import {
  resetFakeDb,
  seedPlayerPokemon,
  seedKnownMove,
  seedInventoryItem,
  getPlayerPokemonRow,
  getInventoryItemRow,
  getKnownMovesFor,
  getNotificationsFor,
} from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("a confirmed stone evolution consumes exactly one stone and evolves the same row in place", async () => {
  const level = 20;
  const currentHp = 15;
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level, currentHp, experience: 4321, partySlot: 2 });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "ember", slot: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "fire-stone", quantity: 3 });

  const result = await acceptStoneEvolution("owner-1", "mon-1", "fire-stone");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.newSpeciesId, "ninetales");
  assert.equal(result.remainingStoneQuantity, 2);

  const row = getPlayerPokemonRow("mon-1");
  assert.equal(row?.id, "mon-1", "same row — never a new owned Pokémon");
  assert.equal(row?.speciesId, "ninetales");
  assert.equal(row?.level, level, "level is untouched by a stone evolution");
  assert.equal(row?.experience, 4321, "XP is untouched by a stone evolution");
  assert.equal(row?.partySlot, 2, "party position is preserved");

  assert.equal(getInventoryItemRow("owner-1", "fire-stone")?.quantity, 2, "exactly one stone was consumed");
  assert.deepEqual(getKnownMovesFor("mon-1"), [{ moveId: "ember", slot: 1 }], "Known Moves are untouched");

  const vulpix = getSpeciesById("vulpix")!;
  const ninetales = getSpeciesById("ninetales")!;
  const oldMaxHp = calculatePokemonHpStat(vulpix.baseStats.health, level);
  const newMaxHp = calculatePokemonHpStat(ninetales.baseStats.health, level);
  const missingHp = oldMaxHp - currentHp;
  assert.equal(result.newCurrentHp, newMaxHp - missingHp, "missing HP is preserved exactly, not a full heal");

  const notifications = getNotificationsFor("owner-1");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.type, "POKEMON_EVOLVED");
});

test("an invalid stone/species pairing is rejected and changes nothing — Vulpix never evolves with a Water Stone", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level: 20 });
  seedInventoryItem({ playerId: "owner-1", itemId: "water-stone", quantity: 3 });

  const result = await acceptStoneEvolution("owner-1", "mon-1", "water-stone");

  assert.equal(result.status, "invalid-target");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "vulpix");
  assert.equal(getInventoryItemRow("owner-1", "water-stone")?.quantity, 3, "the stone is never consumed on a rejected attempt");
});

test("owning zero of the required stone is rejected and changes nothing", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level: 20 });
  // No fire-stone row seeded at all — the player owns none.

  const result = await acceptStoneEvolution("owner-1", "mon-1", "fire-stone");

  assert.equal(result.status, "insufficient-stone");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "vulpix");
});

test("a duplicate confirmation cannot consume a second stone once the first has already evolved the Pokémon", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level: 20 });
  seedInventoryItem({ playerId: "owner-1", itemId: "fire-stone", quantity: 5 });

  const first = await acceptStoneEvolution("owner-1", "mon-1", "fire-stone");
  const second = await acceptStoneEvolution("owner-1", "mon-1", "fire-stone");

  assert.equal(first.status, "success");
  assert.equal(second.status, "invalid-target", "the Pokémon is no longer a Vulpix by the second attempt");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "ninetales");
  assert.equal(
    getInventoryItemRow("owner-1", "fire-stone")?.quantity,
    4,
    "only one stone was ever spent, even though 5 were available and two attempts were made"
  );
});

test("a Pokémon permanently blocked from LEVEL evolution can still evolve with a valid stone", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "eevee", level: 20, evolutionPermanentlyBlocked: true });
  seedInventoryItem({ playerId: "owner-1", itemId: "water-stone", quantity: 1 });

  const result = await acceptStoneEvolution("owner-1", "mon-1", "water-stone");

  assert.equal(result.status, "success");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "vaporeon");
  assert.equal(getPlayerPokemonRow("mon-1")?.evolutionPermanentlyBlocked, true, "the level-evolution flag itself is never touched");
});

test("an unauthorized player cannot evolve another player's Pokémon", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level: 20 });
  seedInventoryItem({ playerId: "intruder-1", itemId: "fire-stone", quantity: 5 });

  const result = await acceptStoneEvolution("intruder-1", "mon-1", "fire-stone");

  assert.equal(result.status, "not-owned");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "vulpix");
  assert.equal(getInventoryItemRow("intruder-1", "fire-stone")?.quantity, 5, "unaffected by the unauthorized attempt");
});
