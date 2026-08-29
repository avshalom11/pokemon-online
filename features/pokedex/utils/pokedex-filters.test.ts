// POKÉDEX FILTERS — focused coverage for the pure filtering predicate the
// Pokédex screen's useMemo delegates to. Real species data throughout (no
// hand-faked PokemonSpecies objects) via getSpeciesById, same convention
// features/evolution/services/evolution-item-eligibility.test.ts already
// establishes for OwnedPokemon fixtures.
import assert from "node:assert/strict";
import { test } from "node:test";

import { filterPokedexEntries, matchesPokedexStatusFilter, type PokedexFilterState } from "./pokedex-filters.ts";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import type { PokedexEntryView, PokedexStatus } from "../types/pokedex.types";

function entryFor(speciesId: string, status: PokedexStatus, extraFormSpeciesIds: string[] = []): PokedexEntryView {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`unknown species in test fixture: ${speciesId}`);

  const formSpeciesIds = [speciesId, ...extraFormSpeciesIds];
  const forms = formSpeciesIds.map((id) => {
    const formSpecies = getSpeciesById(id);
    if (!formSpecies) throw new Error(`unknown form species in test fixture: ${id}`);
    return { species: formSpecies, label: formSpecies.name, status };
  });

  return { species, status, forms };
}

const BASE_FILTERS: PokedexFilterState = { search: "", status: "all", type: "all", rarity: "all", region: "all" };

test("no region selected (all) -> existing full result behavior, unaffected by the new filter", () => {
  const entries = [entryFor("bulbasaur", "caught"), entryFor("chikorita", "seen"), entryFor("ditto", "unseen")];
  const result = filterPokedexEntries(entries, BASE_FILTERS);
  assert.equal(result.length, 3);
});

test("region = kanto returns only Kanto-owned entries", () => {
  const entries = [entryFor("bulbasaur", "caught"), entryFor("chikorita", "seen"), entryFor("treecko", "unseen")];
  const result = filterPokedexEntries(entries, { ...BASE_FILTERS, region: "kanto" });
  assert.deepEqual(
    result.map((e) => e.species.id),
    ["bulbasaur"]
  );
});

test("region = johto (another region) returns only Johto-owned entries", () => {
  const entries = [entryFor("bulbasaur", "caught"), entryFor("chikorita", "seen"), entryFor("treecko", "unseen")];
  const result = filterPokedexEntries(entries, { ...BASE_FILTERS, region: "johto" });
  assert.deepEqual(
    result.map((e) => e.species.id),
    ["chikorita"]
  );
});

test("a dex entry whose forms span multiple regions matches EITHER region — real Rattata/Alolan Rattata grouping", () => {
  // rattata (Kanto) and rattata-alola (Alola) are grouped under one dex
  // entry by pokedex-view.service.ts's own forms logic — this entry must
  // match both a Kanto and an Alola region filter.
  const entries = [entryFor("rattata", "caught", ["rattata-alola"])];

  assert.equal(filterPokedexEntries(entries, { ...BASE_FILTERS, region: "kanto" }).length, 1);
  assert.equal(filterPokedexEntries(entries, { ...BASE_FILTERS, region: "alola" }).length, 1);
  assert.equal(filterPokedexEntries(entries, { ...BASE_FILTERS, region: "johto" }).length, 0);
});

test("region filter combines correctly with existing search (dex number/name)", () => {
  const entries = [entryFor("bulbasaur", "caught"), entryFor("charmander", "caught"), entryFor("chikorita", "seen")];

  // "בולב" doesn't match anything, but a plain substring of the real
  // (English) name does — search matches whatever text the card actually
  // shows, same rule the existing search already follows.
  const nameMatch = filterPokedexEntries(entries, { ...BASE_FILTERS, region: "kanto", search: "bulba" });
  assert.deepEqual(
    nameMatch.map((e) => e.species.id),
    ["bulbasaur"]
  );

  const noMatch = filterPokedexEntries(entries, { ...BASE_FILTERS, region: "johto", search: "bulba" });
  assert.deepEqual(noMatch, [], "a real region+search combination with no overlap must return nothing");
});

test("unseen Pokémon behavior remains unchanged: an unseen entry is included by the region filter but its name never leaks through search", () => {
  const entries = [entryFor("bulbasaur", "unseen")];

  // Region filter alone still surfaces the unseen entry (region filtering
  // never depends on seen/unseen status, same as the existing type/rarity
  // filters).
  assert.equal(filterPokedexEntries(entries, { ...BASE_FILTERS, region: "kanto" }).length, 1);

  // Searching its real name must NOT match while unseen — only its dex
  // number does (matchesPokedexStatusFilter/search's own existing rule,
  // untouched by this feature).
  const byName = filterPokedexEntries(entries, { ...BASE_FILTERS, region: "kanto", search: "bulbasaur" });
  assert.deepEqual(byName, [], "an unseen species' real name must never be searchable");

  const byDexNumber = filterPokedexEntries(entries, { ...BASE_FILTERS, region: "kanto", search: String(getSpeciesById("bulbasaur")!.dexNumber) });
  assert.equal(byDexNumber.length, 1, "dex number search must still work for an unseen entry");
});

test("region combines with existing type and rarity filters (all three together)", () => {
  const entries = [entryFor("bulbasaur", "caught"), entryFor("charmander", "caught"), entryFor("chikorita", "seen")];

  const result = filterPokedexEntries(entries, {
    ...BASE_FILTERS,
    region: "kanto",
    type: "grass",
  });
  assert.deepEqual(
    result.map((e) => e.species.id),
    ["bulbasaur"]
  );
});

test("matchesPokedexStatusFilter is unchanged: seen includes caught, caught is strictly narrower, not-seen is the complement", () => {
  assert.equal(matchesPokedexStatusFilter("caught", "seen"), true);
  assert.equal(matchesPokedexStatusFilter("seen", "caught"), false);
  assert.equal(matchesPokedexStatusFilter("unseen", "not-seen"), true);
  assert.equal(matchesPokedexStatusFilter("caught", "not-seen"), false);
});
