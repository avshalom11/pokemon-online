// Focused regression tests for accepting an EVOLUTION-ITEM evolution from
// the Inventory — deliberately small (per this phase's own "essential
// tests only" instruction): one test per rule that would silently break
// the feature, not exhaustive coverage of the whole species roster. Covers
// both original Stones and the former Trade-item evolutions (now merged
// into the same accept flow, with no trade of any kind).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { acceptEvolutionItem } from "./accept-evolution-item.service.ts";
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

test("a confirmed evolution-item evolution consumes exactly one item and evolves the same row in place", async () => {
  const level = 20;
  const currentHp = 15;
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level, currentHp, experience: 4321, partySlot: 2 });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "ember", slot: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "fire-stone", quantity: 3 });

  const result = await acceptEvolutionItem("owner-1", "mon-1", "fire-stone");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.newSpeciesId, "ninetales");
  assert.equal(result.remainingItemQuantity, 2);

  const row = getPlayerPokemonRow("mon-1");
  assert.equal(row?.id, "mon-1", "same row — never a new owned Pokémon");
  assert.equal(row?.speciesId, "ninetales");
  assert.equal(row?.level, level, "level is untouched by an evolution-item evolution");
  assert.equal(row?.experience, 4321, "XP is untouched by an evolution-item evolution");
  assert.equal(row?.partySlot, 2, "party position is preserved");

  assert.equal(getInventoryItemRow("owner-1", "fire-stone")?.quantity, 2, "exactly one item was consumed");
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

test("a former Trade-item evolution (Onix + Metal Coat) evolves directly, with no trade involved", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "onix", level: 25, currentHp: 30, partySlot: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "metal-coat", quantity: 1 });

  const result = await acceptEvolutionItem("owner-1", "mon-1", "metal-coat");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.newSpeciesId, "steelix");
  assert.equal(result.remainingItemQuantity, 0);
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "steelix");
});

test("an invalid item/species pairing is rejected and changes nothing — Vulpix never evolves with a Water Stone", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level: 20 });
  seedInventoryItem({ playerId: "owner-1", itemId: "water-stone", quantity: 3 });

  const result = await acceptEvolutionItem("owner-1", "mon-1", "water-stone");

  assert.equal(result.status, "invalid-target");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "vulpix");
  assert.equal(getInventoryItemRow("owner-1", "water-stone")?.quantity, 3, "the item is never consumed on a rejected attempt");
});

test("owning zero of the required item is rejected and changes nothing", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level: 20 });
  // No fire-stone row seeded at all — the player owns none.

  const result = await acceptEvolutionItem("owner-1", "mon-1", "fire-stone");

  assert.equal(result.status, "insufficient-item");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "vulpix");
});

test("a duplicate confirmation cannot consume a second item once the first has already evolved the Pokémon", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level: 20 });
  seedInventoryItem({ playerId: "owner-1", itemId: "fire-stone", quantity: 5 });

  const first = await acceptEvolutionItem("owner-1", "mon-1", "fire-stone");
  const second = await acceptEvolutionItem("owner-1", "mon-1", "fire-stone");

  assert.equal(first.status, "success");
  assert.equal(second.status, "invalid-target", "the Pokémon is no longer a Vulpix by the second attempt");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "ninetales");
  assert.equal(
    getInventoryItemRow("owner-1", "fire-stone")?.quantity,
    4,
    "only one item was ever spent, even though 5 were available and two attempts were made"
  );
});

test("a Pokémon permanently blocked from LEVEL evolution can still evolve with a valid item", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "eevee", level: 20, evolutionPermanentlyBlocked: true });
  seedInventoryItem({ playerId: "owner-1", itemId: "water-stone", quantity: 1 });

  const result = await acceptEvolutionItem("owner-1", "mon-1", "water-stone");

  assert.equal(result.status, "success");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "vaporeon");
  assert.equal(getPlayerPokemonRow("mon-1")?.evolutionPermanentlyBlocked, true, "the level-evolution flag itself is never touched");
});

test("Clamperl + Water Stone evolves into whichever branch target is explicitly chosen (Huntail or Gorebyss)", async () => {
  seedPlayerPokemon({ id: "mon-huntail", playerId: "owner-1", speciesId: "clamperl", level: 20 });
  seedInventoryItem({ playerId: "owner-1", itemId: "water-stone", quantity: 2 });

  const huntailResult = await acceptEvolutionItem("owner-1", "mon-huntail", "water-stone", "huntail");
  assert.equal(huntailResult.status, "success");
  assert.equal(getPlayerPokemonRow("mon-huntail")?.speciesId, "huntail");

  seedPlayerPokemon({ id: "mon-gorebyss", playerId: "owner-1", speciesId: "clamperl", level: 20 });
  const gorebyssResult = await acceptEvolutionItem("owner-1", "mon-gorebyss", "water-stone", "gorebyss");
  assert.equal(gorebyssResult.status, "success");
  assert.equal(getPlayerPokemonRow("mon-gorebyss")?.speciesId, "gorebyss");
});

test("Clamperl + Water Stone with no chosen target (or an unrelated one) is rejected — never defaults to Huntail", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "clamperl", level: 20 });
  seedInventoryItem({ playerId: "owner-1", itemId: "water-stone", quantity: 2 });

  const noTarget = await acceptEvolutionItem("owner-1", "mon-1", "water-stone");
  assert.equal(noTarget.status, "invalid-target");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "clamperl");
  assert.equal(getInventoryItemRow("owner-1", "water-stone")?.quantity, 2, "no item consumed on an ambiguous/invalid attempt");

  const wrongTarget = await acceptEvolutionItem("owner-1", "mon-1", "water-stone", "vaporeon");
  assert.equal(wrongTarget.status, "invalid-target");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "clamperl");
});

test("Evolution Item Cleanup remapped species evolve from their new item: Electabuzz (Thunder Stone), Magmar (Fire Stone), Porygon2 (Upgrade)", async () => {
  seedPlayerPokemon({ id: "mon-electabuzz", playerId: "owner-1", speciesId: "electabuzz", level: 30 });
  seedInventoryItem({ playerId: "owner-1", itemId: "thunder-stone", quantity: 1 });
  const electabuzzResult = await acceptEvolutionItem("owner-1", "mon-electabuzz", "thunder-stone");
  assert.equal(electabuzzResult.status, "success");
  assert.equal(getPlayerPokemonRow("mon-electabuzz")?.speciesId, "electivire");

  seedPlayerPokemon({ id: "mon-magmar", playerId: "owner-1", speciesId: "magmar", level: 30 });
  seedInventoryItem({ playerId: "owner-1", itemId: "fire-stone", quantity: 1 });
  const magmarResult = await acceptEvolutionItem("owner-1", "mon-magmar", "fire-stone");
  assert.equal(magmarResult.status, "success");
  assert.equal(getPlayerPokemonRow("mon-magmar")?.speciesId, "magmortar");

  seedPlayerPokemon({ id: "mon-porygon2", playerId: "owner-1", speciesId: "porygon2", level: 30 });
  seedInventoryItem({ playerId: "owner-1", itemId: "upgrade", quantity: 1 });
  const porygon2Result = await acceptEvolutionItem("owner-1", "mon-porygon2", "upgrade");
  assert.equal(porygon2Result.status, "success");
  assert.equal(getPlayerPokemonRow("mon-porygon2")?.speciesId, "porygon-z");
});

test("an unauthorized player cannot evolve another player's Pokémon", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level: 20 });
  seedInventoryItem({ playerId: "intruder-1", itemId: "fire-stone", quantity: 5 });

  const result = await acceptEvolutionItem("intruder-1", "mon-1", "fire-stone");

  assert.equal(result.status, "not-owned");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "vulpix");
  assert.equal(getInventoryItemRow("intruder-1", "fire-stone")?.quantity, 5, "unaffected by the unauthorized attempt");
});
