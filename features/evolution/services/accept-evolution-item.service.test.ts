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
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedPlayerPokemon,
  seedKnownMove,
  seedInventoryItem,
  seedMarketplaceListing,
  seedMarketplaceListingPokemon,
  seedFieldBattleSession,
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

// ============================================================================
// MEGA EVOLUTION PHASE 3 — Mega Stone flows through this exact same accept
// flow with zero code changes to this file (data/pokemon/pokemon-
// evolutions.ts's EVOLUTION_ITEM_EVOLUTIONS table is the only thing that
// changed, in Phase 2). These tests exist to prove that integration end to
// end (single-target, multi-target branch choice, invalid target, already-
// Mega exclusion, exactly-once consumption, full progression preservation),
// not to add new accept-flow logic.
// ============================================================================

test("Mega Stone (single target): Venusaur permanently Mega Evolves, consuming exactly one Mega Stone and preserving level/XP/party slot/Known Moves", async () => {
  const level = 34;
  const currentHp = 50;
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "venusaur", level, currentHp, experience: 9001, partySlot: 3 });
  seedKnownMove({ playerPokemonId: "mon-1", moveId: "razor-leaf", slot: 1 });
  seedInventoryItem({ playerId: "owner-1", itemId: "mega-stone", quantity: 2 });

  const result = await acceptEvolutionItem("owner-1", "mon-1", "mega-stone", "venusaur-mega");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.newSpeciesId, "venusaur-mega");
  assert.equal(result.remainingItemQuantity, 1, "exactly one Mega Stone was consumed");

  const row = getPlayerPokemonRow("mon-1");
  assert.equal(row?.id, "mon-1", "same PlayerPokemon row — never a new one");
  assert.equal(row?.speciesId, "venusaur-mega");
  assert.equal(row?.level, level, "level is preserved");
  assert.equal(row?.experience, 9001, "experience is preserved");
  assert.equal(row?.partySlot, 3, "party position is preserved");
  assert.equal(getInventoryItemRow("owner-1", "mega-stone")?.quantity, 1);
  assert.deepEqual(getKnownMovesFor("mon-1"), [{ moveId: "razor-leaf", slot: 1 }], "Known Moves are preserved");

  const notifications = getNotificationsFor("owner-1");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.type, "POKEMON_EVOLVED");
});

test("Mega Stone (single target): a species with exactly one Mega target uses the normal confirm flow with no targetSpeciesId required", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "gengar", level: 40 });
  seedInventoryItem({ playerId: "owner-1", itemId: "mega-stone", quantity: 1 });

  const result = await acceptEvolutionItem("owner-1", "mon-1", "mega-stone");

  assert.equal(result.status, "success");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "gengar-mega");
});

test("Mega Stone (multi-target): Charizard evolves into whichever branch is explicitly chosen (X or Y), never a default", async () => {
  seedPlayerPokemon({ id: "mon-x", playerId: "owner-1", speciesId: "charizard", level: 50 });
  seedInventoryItem({ playerId: "owner-1", itemId: "mega-stone", quantity: 2 });

  const xResult = await acceptEvolutionItem("owner-1", "mon-x", "mega-stone", "charizard-mega-x");
  assert.equal(xResult.status, "success");
  assert.equal(getPlayerPokemonRow("mon-x")?.speciesId, "charizard-mega-x");

  seedPlayerPokemon({ id: "mon-y", playerId: "owner-1", speciesId: "charizard", level: 50 });
  const yResult = await acceptEvolutionItem("owner-1", "mon-y", "mega-stone", "charizard-mega-y");
  assert.equal(yResult.status, "success");
  assert.equal(getPlayerPokemonRow("mon-y")?.speciesId, "charizard-mega-y");
});

test("Mega Stone (multi-target): Garchomp's plain-vs-Z choice, and Absol's plain-vs-Z choice, each work the same explicit-branch way", async () => {
  seedPlayerPokemon({ id: "mon-garchomp-z", playerId: "owner-1", speciesId: "garchomp", level: 50 });
  seedInventoryItem({ playerId: "owner-1", itemId: "mega-stone", quantity: 4 });
  const garchompZ = await acceptEvolutionItem("owner-1", "mon-garchomp-z", "mega-stone", "garchomp-mega-z");
  assert.equal(garchompZ.status, "success");
  assert.equal(getPlayerPokemonRow("mon-garchomp-z")?.speciesId, "garchomp-mega-z");

  seedPlayerPokemon({ id: "mon-absol-plain", playerId: "owner-1", speciesId: "absol", level: 50 });
  const absolPlain = await acceptEvolutionItem("owner-1", "mon-absol-plain", "mega-stone", "absol-mega");
  assert.equal(absolPlain.status, "success");
  assert.equal(getPlayerPokemonRow("mon-absol-plain")?.speciesId, "absol-mega");
});

test("Mega Stone (multi-target): no chosen target, or an unrelated one, is rejected server-side and consumes nothing — never defaults to X", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "mewtwo", level: 70 });
  seedInventoryItem({ playerId: "owner-1", itemId: "mega-stone", quantity: 3 });

  const noTarget = await acceptEvolutionItem("owner-1", "mon-1", "mega-stone");
  assert.equal(noTarget.status, "invalid-target");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "mewtwo");
  assert.equal(getInventoryItemRow("owner-1", "mega-stone")?.quantity, 3, "no item consumed on an ambiguous attempt");

  const wrongTarget = await acceptEvolutionItem("owner-1", "mon-1", "mega-stone", "mewtwo-mega");
  assert.equal(wrongTarget.status, "invalid-target", "'mewtwo-mega' (no X/Y suffix) is not a real target");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "mewtwo");
  assert.equal(getInventoryItemRow("owner-1", "mega-stone")?.quantity, 3);

  const foreignTarget = await acceptEvolutionItem("owner-1", "mon-1", "mega-stone", "charizard-mega-x");
  assert.equal(foreignTarget.status, "invalid-target", "a real Mega species that isn't one of THIS Pokémon's own targets must be rejected");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "mewtwo");
  assert.equal(getInventoryItemRow("owner-1", "mega-stone")?.quantity, 3);
});

test("Mega Stone: an already-Mega Pokémon is rejected and cannot Mega Evolve again — the item is never consumed", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "lucario-mega", level: 60 });
  seedInventoryItem({ playerId: "owner-1", itemId: "mega-stone", quantity: 1 });

  const result = await acceptEvolutionItem("owner-1", "mon-1", "mega-stone", "lucario-mega-z");

  assert.equal(result.status, "invalid-target");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "lucario-mega", "the Pokémon stays exactly as it was");
  assert.equal(getInventoryItemRow("owner-1", "mega-stone")?.quantity, 1, "the Mega Stone is never consumed on a rejected attempt");
});

test("Mega Stone: owning zero Mega Stones is rejected and changes nothing", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "venusaur", level: 34 });
  // No mega-stone row seeded at all — the player owns none.

  const result = await acceptEvolutionItem("owner-1", "mon-1", "mega-stone", "venusaur-mega");

  assert.equal(result.status, "insufficient-item");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "venusaur");
});

test("Mega Stone: a duplicate/racing confirmation cannot consume a second stone once the first has already Mega Evolved the Pokémon", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "venusaur", level: 34 });
  seedInventoryItem({ playerId: "owner-1", itemId: "mega-stone", quantity: 5 });

  const first = await acceptEvolutionItem("owner-1", "mon-1", "mega-stone", "venusaur-mega");
  const second = await acceptEvolutionItem("owner-1", "mon-1", "mega-stone", "venusaur-mega");

  assert.equal(first.status, "success");
  assert.equal(second.status, "invalid-target", "the Pokémon is no longer a Venusaur by the second attempt");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "venusaur-mega");
  assert.equal(
    getInventoryItemRow("owner-1", "mega-stone")?.quantity,
    4,
    "only one Mega Stone was ever spent, even though 5 were available and two attempts were made"
  );
});

// ============================================================================
// EVOLUTION ITEM LOCK SAFETY FIX — a Pokémon currently listed on the
// Marketplace, or the active participant of a battle, must not be eligible
// for ANY evolution item, generically (not a Mega-specific rule — plain
// Fire Stone is used below to prove that). Reuses the exact same
// authoritative check features/marketplace/services/pokemon-availability.
// service.ts's getPokemonMarketAvailability already uses for its own
// listing eligibility (getPokemonMutationLockReason), re-validated inside
// this service's own transaction immediately before any consumption.
// ============================================================================

test("Marketplace-listed: a Pokémon currently locked into a listing is rejected, and the item is never consumed", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level: 20 });
  seedInventoryItem({ playerId: "owner-1", itemId: "fire-stone", quantity: 3 });
  const listing = seedMarketplaceListing({ sellerId: "owner-1" });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });

  const result = await acceptEvolutionItem("owner-1", "mon-1", "fire-stone");

  assert.deepEqual(result, { status: "pokemon-locked", reason: "already-listed" });
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "vulpix", "speciesId must not change while locked");
  assert.equal(getInventoryItemRow("owner-1", "fire-stone")?.quantity, 3, "the item is never consumed while locked");
});

test("Active field battle: the Pokémon currently battling is rejected, and the item is never consumed", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level: 20 });
  seedInventoryItem({ playerId: "owner-1", itemId: "fire-stone", quantity: 3 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: "grassland",
    wildSpeciesId: "rattata",
    wildLevel: 5,
    wildCurrentHp: 20,
    wildMaxHp: 20,
    activePlayerPokemonId: "mon-1",
  });

  const result = await acceptEvolutionItem("owner-1", "mon-1", "fire-stone");

  assert.deepEqual(result, { status: "pokemon-locked", reason: "in-field-battle" });
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "vulpix", "speciesId must not change while locked");
  assert.equal(getInventoryItemRow("owner-1", "fire-stone")?.quantity, 3, "the item is never consumed while locked");
});

test("Active gym battle: a Pokémon on the NPC-battle roster is rejected, and the item is never consumed (same authoritative check Marketplace itself uses)", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level: 20 });
  seedInventoryItem({ playerId: "owner-1", itemId: "fire-stone", quantity: 3 });
  await prisma.npcBattleSession.create({
    data: {
      playerId: "owner-1",
      battleSource: "gym",
      regionId: "kanto",
      gymNumber: 1,
      npcTeam: [],
      npcCurrentHp: 20,
      playerPokemonIds: ["mon-1"],
      activePlayerPokemonId: "mon-1",
      playerBattleHp: { "mon-1": 20 },
    },
  });

  const result = await acceptEvolutionItem("owner-1", "mon-1", "fire-stone");

  assert.deepEqual(result, { status: "pokemon-locked", reason: "in-gym-battle" });
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "vulpix", "speciesId must not change while locked");
  assert.equal(getInventoryItemRow("owner-1", "fire-stone")?.quantity, 3, "the item is never consumed while locked");
});

test("Mega Stone follows the same lock rules automatically, with no Mega-specific code: a Marketplace-listed Pokémon cannot Mega Evolve", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "venusaur", level: 34 });
  seedInventoryItem({ playerId: "owner-1", itemId: "mega-stone", quantity: 1 });
  const listing = seedMarketplaceListing({ sellerId: "owner-1" });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });

  const result = await acceptEvolutionItem("owner-1", "mon-1", "mega-stone", "venusaur-mega");

  assert.deepEqual(result, { status: "pokemon-locked", reason: "already-listed" });
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "venusaur");
  assert.equal(getInventoryItemRow("owner-1", "mega-stone")?.quantity, 1);
});

test("Normal, unlocked evolution still succeeds after the lock check — the added validation never blocks a legitimate attempt", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "vulpix", level: 20 });
  seedInventoryItem({ playerId: "owner-1", itemId: "fire-stone", quantity: 2 });

  const result = await acceptEvolutionItem("owner-1", "mon-1", "fire-stone");

  assert.equal(result.status, "success");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "ninetales");
  assert.equal(getInventoryItemRow("owner-1", "fire-stone")?.quantity, 1);
});

test("Mega Stone: a Pokémon permanently blocked from LEVEL evolution can still Mega Evolve (evolution-item evolution is fully independent of that flag)", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "absol", level: 40, evolutionPermanentlyBlocked: true });
  seedInventoryItem({ playerId: "owner-1", itemId: "mega-stone", quantity: 1 });

  const result = await acceptEvolutionItem("owner-1", "mon-1", "mega-stone", "absol-mega");

  assert.equal(result.status, "success");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "absol-mega");
  assert.equal(getPlayerPokemonRow("mon-1")?.evolutionPermanentlyBlocked, true, "the level-evolution flag itself is never touched");
});
