// Focused regression tests for accepting an evolution — same instance
// evolves in place, level/XP/party-position are preserved, and HP is
// recalculated while preserving the exact amount of missing HP.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { acceptEvolution } from "./accept-evolution.service.ts";
import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { resetFakeDb, seedPlayerPokemon, getPlayerPokemonRow } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("accepting evolves the same PlayerPokemon row in place, preserving level/XP/party position", async () => {
  seedPlayerPokemon({
    id: "mon-1",
    playerId: "owner-1",
    speciesId: "charmander",
    level: 20,
    experience: 1234,
    currentHp: 15,
    partySlot: 3,
    pendingEvolutionSpeciesId: "charmeleon",
  });

  const result = await acceptEvolution("owner-1", "mon-1");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.newSpeciesId, "charmeleon");

  const row = getPlayerPokemonRow("mon-1");
  assert.equal(row?.id, "mon-1", "same row id — never a new owned Pokémon");
  assert.equal(row?.speciesId, "charmeleon");
  assert.equal(row?.level, 20);
  assert.equal(row?.experience, 1234);
  assert.equal(row?.partySlot, 3);
  assert.equal(row?.pendingEvolutionSpeciesId, null);
  assert.equal(row?.evolutionPermanentlyBlocked, false);
});

test("HP is recalculated for the evolved species while preserving the exact amount of missing HP", async () => {
  const charmander = getSpeciesById("charmander")!;
  const charmeleon = getSpeciesById("charmeleon")!;
  const level = 20;
  const oldMaxHp = calculatePokemonHpStat(charmander.baseStats.health, level);
  const newMaxHp = calculatePokemonHpStat(charmeleon.baseStats.health, level);
  const currentHp = 15;
  const missingHp = oldMaxHp - currentHp;

  seedPlayerPokemon({
    id: "mon-1",
    playerId: "owner-1",
    speciesId: "charmander",
    level,
    currentHp,
    pendingEvolutionSpeciesId: "charmeleon",
  });

  const result = await acceptEvolution("owner-1", "mon-1");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.newMaxHp, newMaxHp);
  assert.equal(result.newCurrentHp, newMaxHp - missingHp);
  assert.ok(result.newCurrentHp <= newMaxHp, "never exceeds new max HP");
  assert.equal(getPlayerPokemonRow("mon-1")?.currentHp, result.newCurrentHp);
});

test("a fainted Pokémon stays at exactly 0 HP after evolving — evolution never revives it", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", level: 20, currentHp: 0, pendingEvolutionSpeciesId: "charmeleon" });

  const result = await acceptEvolution("owner-1", "mon-1");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.newCurrentHp, 0);
});

test("an unauthorized player cannot accept another player's pending evolution", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", level: 20, pendingEvolutionSpeciesId: "charmeleon" });

  const result = await acceptEvolution("intruder-1", "mon-1");

  assert.equal(result.status, "not-owned");
  assert.equal(getPlayerPokemonRow("mon-1")?.speciesId, "charmander", "unaffected by the unauthorized attempt");
});

test("accepting without a pending evolution is rejected", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", level: 20 });

  const result = await acceptEvolution("owner-1", "mon-1");

  assert.equal(result.status, "no-pending-evolution");
});
