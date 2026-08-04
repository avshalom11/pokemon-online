// Focused regression tests for Pokédex progress — deliberately small (per
// this phase's own "essential tests only" instruction): one test per rule
// that would silently break the feature, not exhaustive coverage of the
// whole species roster.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { markSpeciesSeen } from "./mark-species-seen.service.ts";
import { getPokedexView } from "./pokedex-view.service.ts";
import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerPokemon, getSeenSpeciesRows } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("encountering a species marks it seen exactly once, even when called again (refresh/reopen the same battle)", async () => {
  await markSpeciesSeen(prisma, "owner-1", "pikachu");
  await markSpeciesSeen(prisma, "owner-1", "pikachu");

  const rows = getSeenSpeciesRows("owner-1");
  assert.equal(rows.length, 1, "a repeated mark must never create a duplicate record");
  assert.equal(rows[0]?.speciesId, "pikachu");
});

test("owning a Pokémon marks its species as caught", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "bulbasaur" });

  const view = await getPokedexView("owner-1");
  const entry = view.find((e) => e.species.id === "bulbasaur");

  assert.equal(entry?.status, "caught");
});

test("a Pokémon in storage (no party slot) counts as caught, exactly like a party member", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", partySlot: null });

  const view = await getPokedexView("owner-1");
  const entry = view.find((e) => e.species.id === "charmander");

  assert.equal(entry?.status, "caught");
});

test("another player's seen/caught progress is never visible", async () => {
  await markSpeciesSeen(prisma, "owner-1", "pikachu");
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "bulbasaur" });

  const otherPlayerView = await getPokedexView("owner-2");
  const pikachuEntry = otherPlayerView.find((e) => e.species.id === "pikachu");
  const bulbasaurEntry = otherPlayerView.find((e) => e.species.id === "bulbasaur");

  assert.equal(pikachuEntry?.status, "unseen");
  assert.equal(bulbasaurEntry?.status, "unseen");
});

test("returns all species, sorted in Pokédex (dex number) order", async () => {
  const view = await getPokedexView("owner-1");

  assert.equal(view.length, POKEMON_DATA.length);
  for (let i = 1; i < view.length; i++) {
    assert.ok(view[i]!.species.dexNumber > view[i - 1]!.species.dexNumber, "entries must be strictly increasing by dex number");
  }
});
