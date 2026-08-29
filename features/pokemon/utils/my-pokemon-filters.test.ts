// MY POKÉMON — REGION / RARITY / TYPE FILTERS. Focused coverage for the
// pure filtering predicate the collection screen's useMemo delegates to.
// Same OwnedPokemon fixture-building convention features/evolution/
// services/evolution-item-eligibility.test.ts already establishes (a real,
// catalog-backed species via getSpeciesById, never a hand-faked one).
import assert from "node:assert/strict";
import { test } from "node:test";

import { ALL_MY_POKEMON_FILTERS, filterMyPokemonCollection, type MyPokemonFilterState } from "./my-pokemon-filters.ts";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

function makeOwned(id: string, speciesId: string, overrides: Partial<OwnedPokemon> = {}): OwnedPokemon {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`unknown species in test fixture: ${speciesId}`);

  return {
    id,
    species,
    nickname: null,
    level: 20,
    experience: 0,
    currentHp: 10,
    maxHp: 30,
    isStarter: false,
    caughtAt: new Date(),
    isShiny: false,
    partySlot: null,
    status: null,
    statusTurnsRemaining: null,
    ...overrides,
  };
}

// bulbasaur: Kanto, very-rare, grass/poison (dual type).
// chikorita: Johto, very-rare-adjacent starter line — used as a
// non-Kanto/non-grass-only contrast.
// pidgey / rattata: Kanto, common, normal(/flying).
const BULBASAUR = makeOwned("mon-bulbasaur", "bulbasaur");
const CHIKORITA = makeOwned("mon-chikorita", "chikorita");
const PIDGEY = makeOwned("mon-pidgey", "pidgey");
const RATTATA = makeOwned("mon-rattata", "rattata");

const ALL_MONS = [BULBASAUR, CHIKORITA, PIDGEY, RATTATA];

function idsOf(result: OwnedPokemon[]): string[] {
  return result.map((p) => p.id);
}

test("resetting filters (ALL_MY_POKEMON_FILTERS) restores the full, unfiltered collection", () => {
  const result = filterMyPokemonCollection(ALL_MONS, ALL_MY_POKEMON_FILTERS);
  assert.equal(result.length, ALL_MONS.length);
});

test("region only: Kanto returns every Kanto-owned member, excluding Johto", () => {
  const filters: MyPokemonFilterState = { ...ALL_MY_POKEMON_FILTERS, region: "kanto" };
  const result = filterMyPokemonCollection(ALL_MONS, filters);
  assert.deepEqual(new Set(idsOf(result)), new Set([BULBASAUR.id, PIDGEY.id, RATTATA.id]));
});

test("rarity only: very-rare returns every very-rare member (both starters here), excluding the common ones", () => {
  const filters: MyPokemonFilterState = { ...ALL_MY_POKEMON_FILTERS, rarity: "very-rare" };
  const result = filterMyPokemonCollection(ALL_MONS, filters);
  assert.deepEqual(new Set(idsOf(result)), new Set([BULBASAUR.id, CHIKORITA.id]));
});

test("type only: 'normal' returns every member carrying that type", () => {
  const filters: MyPokemonFilterState = { ...ALL_MY_POKEMON_FILTERS, type: "normal" };
  const result = filterMyPokemonCollection(ALL_MONS, filters);
  assert.deepEqual(new Set(idsOf(result)), new Set([PIDGEY.id, RATTATA.id]));
});

test("dual-type Pokémon matches a type filter on EITHER of its two types", () => {
  // bulbasaur is grass/poison. chikorita is grass-only, so it correctly
  // also matches the "grass" filter (proves grass isn't somehow exclusive
  // to bulbasaur) — but only bulbasaur carries poison, isolating that its
  // SECOND type alone is enough to match, without requiring grass too.
  const grassResult = filterMyPokemonCollection(ALL_MONS, { ...ALL_MY_POKEMON_FILTERS, type: "grass" });
  assert.deepEqual(new Set(idsOf(grassResult)), new Set([BULBASAUR.id, CHIKORITA.id]));

  const poisonResult = filterMyPokemonCollection(ALL_MONS, { ...ALL_MY_POKEMON_FILTERS, type: "poison" });
  assert.deepEqual(idsOf(poisonResult), [BULBASAUR.id], "bulbasaur must match on its SECOND type (poison) alone, with no other member sharing it");
});

test("region + rarity combine with AND semantics", () => {
  const filters: MyPokemonFilterState = { region: "kanto", rarity: "common", type: "all" };
  const result = filterMyPokemonCollection(ALL_MONS, filters);
  assert.deepEqual(new Set(idsOf(result)), new Set([PIDGEY.id, RATTATA.id]));
});

test("region + type combine with AND semantics", () => {
  const filters: MyPokemonFilterState = { region: "kanto", rarity: "all", type: "flying" };
  const result = filterMyPokemonCollection(ALL_MONS, filters);
  assert.deepEqual(idsOf(result), [PIDGEY.id], "only pidgey is both Kanto AND flying-type");
});

test("rarity + type combine with AND semantics", () => {
  const filters: MyPokemonFilterState = { region: "all", rarity: "very-rare", type: "poison" };
  const result = filterMyPokemonCollection(ALL_MONS, filters);
  assert.deepEqual(idsOf(result), [BULBASAUR.id]);
});

test("region + rarity + type all three together (the task's own worked example shape)", () => {
  const filters: MyPokemonFilterState = { region: "kanto", rarity: "very-rare", type: "grass" };
  const result = filterMyPokemonCollection(ALL_MONS, filters);
  assert.deepEqual(idsOf(result), [BULBASAUR.id]);

  // Changing only the type to something bulbasaur doesn't have (fire)
  // while keeping the same region+rarity must exclude it — proves all
  // three conditions are genuinely ANDed, not just the first match short-circuiting true.
  const noMatch = filterMyPokemonCollection(ALL_MONS, { ...filters, type: "fire" });
  assert.deepEqual(noMatch, []);
});

test("party membership, starter flag, and every other OwnedPokemon field survive filtering completely unchanged (same object identity)", () => {
  const partyMember = makeOwned("mon-party", "charmander", { partySlot: 1, isStarter: true });
  const [result] = filterMyPokemonCollection([partyMember], { ...ALL_MY_POKEMON_FILTERS, region: "kanto" });
  assert.equal(result, partyMember, "filtering must never clone/rebuild the OwnedPokemon object — same reference");
  assert.equal(result.partySlot, 1);
  assert.equal(result.isStarter, true);
});

test("no unnecessary reset: changing one filter's value has no bearing on the others — each is independently 'all' by default until explicitly changed", () => {
  const filters: MyPokemonFilterState = { ...ALL_MY_POKEMON_FILTERS, region: "kanto" };
  assert.equal(filters.rarity, "all");
  assert.equal(filters.type, "all");
});
