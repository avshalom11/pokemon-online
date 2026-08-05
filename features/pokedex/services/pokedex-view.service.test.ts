// Focused regression tests for Pokédex progress — deliberately small (per
// this phase's own "essential tests only" instruction): one test per rule
// that would silently break the feature, not exhaustive coverage of the
// whole species roster.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { markSpeciesSeen } from "./mark-species-seen.service.ts";
import { getPokedexView } from "./pokedex-view.service.ts";
import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { isAlternateForm } from "@/features/pokemon/forms/pokemon-forms";
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

test("returns one row per official National Dex number, sorted in Pokédex (dex number) order — alternate forms (Deoxys) never add extra rows", async () => {
  const view = await getPokedexView("owner-1");

  const expectedBaseCount = POKEMON_DATA.filter((species) => !isAlternateForm(species)).length;
  assert.equal(view.length, expectedBaseCount);
  assert.notEqual(view.length, POKEMON_DATA.length, "test assumption: at least one alternate form (Deoxys) exists, so this must differ from the raw catalog length");

  for (let i = 1; i < view.length; i++) {
    assert.ok(view[i]!.species.dexNumber > view[i - 1]!.species.dexNumber, "entries must be strictly increasing by dex number");
  }
});

test("Deoxys groups under exactly one Pokédex row (#386) with all four forms listed, never as separate grid rows", async () => {
  const view = await getPokedexView("owner-1");
  const deoxysRows = view.filter((entry) => entry.species.dexNumber === 386);

  assert.equal(deoxysRows.length, 1, "Deoxys must appear as exactly one Pokédex row");
  assert.equal(deoxysRows[0]!.species.id, "deoxys");
  assert.deepEqual(
    deoxysRows[0]!.forms.map((form) => form.species.id).sort(),
    ["deoxys", "deoxys-attack", "deoxys-defense", "deoxys-speed"]
  );
});

test("catching only Deoxys Attack Form unlocks the #386 entry as caught, while the sibling forms stay individually unseen", async () => {
  seedPlayerPokemon({ id: "mon-deoxys", playerId: "owner-1", speciesId: "deoxys-attack" });

  const view = await getPokedexView("owner-1");
  const deoxysEntry = view.find((entry) => entry.species.dexNumber === 386)!;

  assert.equal(deoxysEntry.status, "caught", "the Dex entry unlocks the moment ANY form is caught");

  const attackForm = deoxysEntry.forms.find((form) => form.species.id === "deoxys-attack")!;
  const normalForm = deoxysEntry.forms.find((form) => form.species.id === "deoxys")!;
  const defenseForm = deoxysEntry.forms.find((form) => form.species.id === "deoxys-defense")!;
  const speedForm = deoxysEntry.forms.find((form) => form.species.id === "deoxys-speed")!;

  assert.equal(attackForm.status, "caught");
  assert.equal(normalForm.status, "unseen", "an unencountered sibling form must stay individually unseen even though the Dex entry itself unlocked");
  assert.equal(defenseForm.status, "unseen");
  assert.equal(speedForm.status, "unseen");
});

test("Rotom groups under exactly one Pokédex row (#479) with all six forms listed, never as separate grid rows", async () => {
  const view = await getPokedexView("owner-1");
  const rotomRows = view.filter((entry) => entry.species.dexNumber === 479);

  assert.equal(rotomRows.length, 1, "Rotom must appear as exactly one Pokédex row");
  assert.equal(rotomRows[0]!.species.id, "rotom");
  assert.deepEqual(
    rotomRows[0]!.forms.map((form) => form.species.id).sort(),
    ["rotom", "rotom-fan", "rotom-frost", "rotom-heat", "rotom-mow", "rotom-wash"]
  );
});
