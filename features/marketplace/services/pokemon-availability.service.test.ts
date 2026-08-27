// MARKETPLACE PHASE 1 — focused coverage for getPokemonMarketAvailability,
// the one "can this specific Pokémon be listed right now" check this phase
// introduces. Runs the REAL function against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getPokemonMarketAvailability } from "@/features/marketplace/services/pokemon-availability.service";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedDaycareStay,
  seedFieldBattleSession,
  seedMarketplaceListingPokemon,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
const POKEMON_ID = "mon-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID });
  seedPlayerPokemon({ id: POKEMON_ID, playerId: PLAYER_ID, speciesId: "bulbasaur" });
});

test("available: a plain owned Pokémon with no locks is available", async () => {
  const result = await getPokemonMarketAvailability(prisma, PLAYER_ID, POKEMON_ID);
  assert.deepEqual(result, { status: "available" });
});

test("available: a Pokémon currently in the active party is still available — party membership never blocks listing", async () => {
  seedPlayerPokemon({ id: "in-party-mon", playerId: PLAYER_ID, speciesId: "charmander", partySlot: 1 });
  const result = await getPokemonMarketAvailability(prisma, PLAYER_ID, "in-party-mon");
  assert.deepEqual(result, { status: "available" });
});

test("not-owned: an id belonging to a different player is rejected", async () => {
  seedPlayerProfile({ id: "other-player" });
  seedPlayerPokemon({ id: "other-mon", playerId: "other-player", speciesId: "squirtle" });
  const result = await getPokemonMarketAvailability(prisma, PLAYER_ID, "other-mon");
  assert.deepEqual(result, { status: "unavailable", reason: "not-owned" });
});

test("not-owned: an id that doesn't exist at all is rejected", async () => {
  const result = await getPokemonMarketAvailability(prisma, PLAYER_ID, "no-such-mon");
  assert.deepEqual(result, { status: "unavailable", reason: "not-owned" });
});

test("is-starter: the original Starter is never tradable", async () => {
  seedPlayerPokemon({ id: "starter-mon", playerId: PLAYER_ID, speciesId: "bulbasaur", isStarter: true });
  const result = await getPokemonMarketAvailability(prisma, PLAYER_ID, "starter-mon");
  assert.deepEqual(result, { status: "unavailable", reason: "is-starter" });
});

test("in-daycare: a currently-deposited Pokémon cannot be listed", async () => {
  seedDaycareStay({ playerPokemonId: POKEMON_ID, playerId: PLAYER_ID, startingLevel: 5 });
  const result = await getPokemonMarketAvailability(prisma, PLAYER_ID, POKEMON_ID);
  assert.deepEqual(result, { status: "unavailable", reason: "in-daycare" });
});

test("in-field-battle: the Pokémon currently active in a wild/tutorial battle cannot be listed", async () => {
  seedFieldBattleSession({
    playerId: PLAYER_ID,
    zoneId: "route-1",
    wildSpeciesId: "rattata",
    wildLevel: 3,
    wildCurrentHp: 20,
    wildMaxHp: 20,
    activePlayerPokemonId: POKEMON_ID,
  });
  const result = await getPokemonMarketAvailability(prisma, PLAYER_ID, POKEMON_ID);
  assert.deepEqual(result, { status: "unavailable", reason: "in-field-battle" });
});

test("in-gym-battle: a Pokémon on the roster of an active NPC (gym/regional-champion) battle cannot be listed", async () => {
  await prisma.npcBattleSession.create({
    data: {
      playerId: PLAYER_ID,
      battleSource: "gym",
      regionId: "kanto",
      gymNumber: 1,
      battleSlot: "leader",
      npcTeam: [{ speciesId: "geodude", level: 12 }],
      npcCurrentHp: 30,
      playerPokemonIds: [POKEMON_ID],
      activePlayerPokemonId: POKEMON_ID,
      playerBattleHp: { [POKEMON_ID]: 20 },
    },
  });
  const result = await getPokemonMarketAvailability(prisma, PLAYER_ID, POKEMON_ID);
  assert.deepEqual(result, { status: "unavailable", reason: "in-gym-battle" });
});

test("in-gym-battle: a bench Pokémon on the roster (not the currently-active one) is also blocked", async () => {
  seedPlayerPokemon({ id: "bench-mon", playerId: PLAYER_ID, speciesId: "ivysaur" });
  await prisma.npcBattleSession.create({
    data: {
      playerId: PLAYER_ID,
      battleSource: "gym",
      regionId: "kanto",
      gymNumber: 1,
      battleSlot: "leader",
      npcTeam: [{ speciesId: "geodude", level: 12 }],
      npcCurrentHp: 30,
      playerPokemonIds: [POKEMON_ID, "bench-mon"],
      activePlayerPokemonId: POKEMON_ID,
      playerBattleHp: { [POKEMON_ID]: 20, "bench-mon": 30 },
    },
  });
  const result = await getPokemonMarketAvailability(prisma, PLAYER_ID, "bench-mon");
  assert.deepEqual(result, { status: "unavailable", reason: "in-gym-battle" });
});

test("already-listed: a Pokémon already locked into a Marketplace listing cannot be listed again", async () => {
  seedMarketplaceListingPokemon({ playerPokemonId: POKEMON_ID, listingId: "listing-1" });
  const result = await getPokemonMarketAvailability(prisma, PLAYER_ID, POKEMON_ID);
  assert.deepEqual(result, { status: "unavailable", reason: "already-listed" });
});

test("in-league-battle: a Pokémon on the joined roster of an in-progress League PvP match (side A) cannot be listed", async () => {
  const participant = await prisma.leagueTournamentParticipant.create({
    data: { tournamentId: "tournament-1", playerId: PLAYER_ID, participantType: "player" },
  });
  const session = await prisma.leagueBattleSession.create({
    data: { tournamentMatchId: "match-1", participantAId: participant.id, participantBId: "computer-participant" },
  });
  await prisma.leagueBattleSession.update({
    where: { id: session.id },
    data: {
      status: "in-progress",
      participantAPokemon: [{ slotId: POKEMON_ID, speciesId: "bulbasaur", level: 10, playerPokemonId: POKEMON_ID }],
    },
  });

  const result = await getPokemonMarketAvailability(prisma, PLAYER_ID, POKEMON_ID);
  assert.deepEqual(result, { status: "unavailable", reason: "in-league-battle" });
});

test("in-league-battle: also caught when the player is side B", async () => {
  const participant = await prisma.leagueTournamentParticipant.create({
    data: { tournamentId: "tournament-1", playerId: PLAYER_ID, participantType: "player" },
  });
  const session = await prisma.leagueBattleSession.create({
    data: { tournamentMatchId: "match-2", participantAId: "computer-participant", participantBId: participant.id },
  });
  await prisma.leagueBattleSession.update({
    where: { id: session.id },
    data: {
      status: "in-progress",
      participantBPokemon: [{ slotId: POKEMON_ID, speciesId: "bulbasaur", level: 10, playerPokemonId: POKEMON_ID }],
    },
  });

  const result = await getPokemonMarketAvailability(prisma, PLAYER_ID, POKEMON_ID);
  assert.deepEqual(result, { status: "unavailable", reason: "in-league-battle" });
});

test("a COMPLETED League match never blocks listing, even if the roster snapshot still lists the Pokémon", async () => {
  const participant = await prisma.leagueTournamentParticipant.create({
    data: { tournamentId: "tournament-1", playerId: PLAYER_ID, participantType: "player" },
  });
  const session = await prisma.leagueBattleSession.create({
    data: { tournamentMatchId: "match-3", participantAId: participant.id, participantBId: "computer-participant" },
  });
  await prisma.leagueBattleSession.update({
    where: { id: session.id },
    data: {
      status: "completed",
      participantAPokemon: [{ slotId: POKEMON_ID, speciesId: "bulbasaur", level: 10, playerPokemonId: POKEMON_ID }],
    },
  });

  const result = await getPokemonMarketAvailability(prisma, PLAYER_ID, POKEMON_ID);
  assert.deepEqual(result, { status: "available" });
});
