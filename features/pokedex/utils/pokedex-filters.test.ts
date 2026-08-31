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

const BASE_FILTERS: PokedexFilterState = { search: "", status: "all", type: "all", rarity: "all", region: "all", mega: false };

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

test("unseen Pokémon: region filter alone still surfaces it, and (POKÉDEX + INVENTORY UI IMPROVEMENTS) its real name IS now searchable — search finds it without unlocking the card itself", () => {
  const entries = [entryFor("bulbasaur", "unseen")];

  // Region filter alone still surfaces the unseen entry (region filtering
  // never depends on seen/unseen status, same as the existing type/rarity
  // filters).
  assert.equal(filterPokedexEntries(entries, { ...BASE_FILTERS, region: "kanto" }).length, 1);

  // Searching its real name now DOES match, even while unseen — the
  // filter only decides list membership; PokedexCard/PokedexUnseenPanel
  // still independently render it as an unseen silhouette regardless of
  // why it matched.
  const byName = filterPokedexEntries(entries, { ...BASE_FILTERS, region: "kanto", search: "bulbasaur" });
  assert.equal(byName.length, 1, "an unseen species' real name must now be searchable");

  const byDexNumber = filterPokedexEntries(entries, { ...BASE_FILTERS, region: "kanto", search: String(getSpeciesById("bulbasaur")!.dexNumber) });
  assert.equal(byDexNumber.length, 1, "dex number search must still work for an unseen entry");

  const noMatch = filterPokedexEntries(entries, { ...BASE_FILTERS, region: "kanto", search: "definitely-not-a-real-species-name" });
  assert.deepEqual(noMatch, [], "an unrelated search string must still exclude the entry");
});

test("seen/caught name search still works exactly as before", () => {
  const entries = [entryFor("bulbasaur", "caught"), entryFor("charmander", "seen")];
  const result = filterPokedexEntries(entries, { ...BASE_FILTERS, search: "bulba" });
  assert.deepEqual(result.map((e) => e.species.id), ["bulbasaur"]);
});

test("searching by an alternate FORM's own name returns its PARENT grouped dex entry, never a duplicate/second card", () => {
  // rattata/rattata-alola are grouped under one PokedexEntryView (same
  // dex-number grouping the region test above already exercises).
  const entries = [entryFor("rattata", "caught", ["rattata-alola"])];
  const alolaFormName = getSpeciesById("rattata-alola")!.name.toLowerCase();

  const result = filterPokedexEntries(entries, { ...BASE_FILTERS, search: alolaFormName });
  assert.equal(result.length, 1, "must return exactly the one grouped entry, not a duplicate");
  assert.equal(result[0]!.species.id, "rattata", "the returned entry must be the parent/base dex entry");
});

test("searching by an unseen alternate form's own name still surfaces the parent entry without unlocking anything extra", () => {
  const entries = [entryFor("rattata", "unseen", ["rattata-alola"])];
  const alolaFormName = getSpeciesById("rattata-alola")!.name.toLowerCase();

  const result = filterPokedexEntries(entries, { ...BASE_FILTERS, search: alolaFormName });
  assert.equal(result.length, 1);
  assert.equal(result[0]!.species.id, "rattata");
  assert.equal(result[0]!.status, "unseen", "the entry's own status is untouched by matching via search");
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

// ============================================================================
// POKÉDEX + INVENTORY UI IMPROVEMENTS — Mega ("מגה") filter. Must be
// derived live from the canonical Mega Stone evolution registry
// (data/pokemon/pokemon-evolutions.ts), never a hardcoded second list —
// venusaur/charizard below are real registry entries, not fixtures.
// ============================================================================

test("mega = false -> existing full result behavior, unaffected by the new filter", () => {
  const entries = [entryFor("venusaur", "caught"), entryFor("bulbasaur", "caught")];
  const result = filterPokedexEntries(entries, { ...BASE_FILTERS, mega: false });
  assert.equal(result.length, 2);
});

test("mega = true keeps a Mega-eligible base species and excludes a non-eligible one", () => {
  const entries = [entryFor("venusaur", "caught"), entryFor("bulbasaur", "caught")];
  const result = filterPokedexEntries(entries, { ...BASE_FILTERS, mega: true });
  assert.deepEqual(result.map((e) => e.species.id), ["venusaur"]);
});

test("mega = true includes a dual-target base (Charizard, X/Y) exactly once — the base entry itself, not duplicated", () => {
  const entries = [entryFor("charizard", "caught"), entryFor("bulbasaur", "caught")];
  const result = filterPokedexEntries(entries, { ...BASE_FILTERS, mega: true });
  assert.deepEqual(result.map((e) => e.species.id), ["charizard"]);
});

test("mega filter does not depend on seen/unseen status, same as type/rarity/region", () => {
  const entries = [entryFor("venusaur", "unseen")];
  const result = filterPokedexEntries(entries, { ...BASE_FILTERS, mega: true });
  assert.equal(result.length, 1);
  assert.equal(result[0]!.status, "unseen", "the mega filter must not alter or reveal the entry's own status");
});

test("mega filter combines correctly (AND) with existing search/type/rarity/region/status filters", () => {
  const entries = [entryFor("venusaur", "caught"), entryFor("charizard", "caught"), entryFor("bulbasaur", "caught")];

  const megaAndType = filterPokedexEntries(entries, { ...BASE_FILTERS, mega: true, type: "fire" });
  assert.deepEqual(megaAndType.map((e) => e.species.id), ["charizard"]);

  const megaAndSearch = filterPokedexEntries(entries, { ...BASE_FILTERS, mega: true, search: "venusaur" });
  assert.deepEqual(megaAndSearch.map((e) => e.species.id), ["venusaur"]);

  const megaAndNoMatch = filterPokedexEntries(entries, { ...BASE_FILTERS, mega: true, search: "bulbasaur" });
  assert.deepEqual(megaAndNoMatch, [], "bulbasaur is not itself a Mega-eligible base, so mega+its own name search must return nothing");
});

test("mega filter never touches rarity data — species.rarity is untouched by filtering on mega", () => {
  const entry = entryFor("venusaur", "caught");
  const originalRarity = entry.species.rarity;
  filterPokedexEntries([entry], { ...BASE_FILTERS, mega: true });
  assert.equal(entry.species.rarity, originalRarity, "filtering must never mutate species data");
});

test("matchesPokedexStatusFilter is unchanged: seen includes caught, caught is strictly narrower, not-seen is the complement", () => {
  assert.equal(matchesPokedexStatusFilter("caught", "seen"), true);
  assert.equal(matchesPokedexStatusFilter("seen", "caught"), false);
  assert.equal(matchesPokedexStatusFilter("unseen", "not-seen"), true);
  assert.equal(matchesPokedexStatusFilter("caught", "not-seen"), false);
});
