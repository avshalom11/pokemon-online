// MY POKÉMON — REGION / RARITY / TYPE FILTERS. Verifies the filters are
// wired correctly into MyPokemonContent without disturbing party
// highlighting, starter behavior, Daycare exclusion, or the total-owned
// stat pill. No React-render/DOM harness exists in this project (other
// components' own *.test.ts files already establish this source-level
// convention) — verified via real source text on the actual, unmodified
// MyPokemonContent.tsx. The filtering LOGIC itself (region/rarity/type
// combinations, dual-type matching, reset behavior) has full behavioral
// coverage in features/pokemon/utils/my-pokemon-filters.test.ts — this file
// only proves the component wires that pure function in correctly.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("./MyPokemonContent.tsx", import.meta.url), "utf8");

test("the collection grid renders the FILTERED list, not the raw data.collection directly", () => {
  assert.ok(source.includes("<PokemonGrid"));
  const gridBlockStart = source.indexOf("<PokemonGrid");
  const gridBlock = source.slice(gridBlockStart, source.indexOf("/>", gridBlockStart) + 2);
  assert.ok(gridBlock.includes("pokemon={filteredCollection}"), "the grid must receive the filtered collection");
  assert.ok(!gridBlock.includes("pokemon={data.collection}"), "the grid must never fall back to the unfiltered collection");
});

test("filteredCollection is derived via the shared, already-tested filterMyPokemonCollection — never a second/duplicated filtering implementation", () => {
  assert.ok(source.includes('import { ALL_MY_POKEMON_FILTERS, filterMyPokemonCollection, type MyPokemonFilterState } from "@/features/pokemon/utils/my-pokemon-filters";'));
  assert.ok(source.includes("filterMyPokemonCollection(data.collection, filters)"), "must filter the page's own once-loaded collection, never re-fetch");
});

test("changing one filter preserves the other two — each onChange spreads the current filter state", () => {
  const onChangeBlocks = source.match(/setFilters\(\(current\) => \(\{ \.\.\.current, \w+: [^}]+\}\)\)/g) ?? [];
  assert.equal(onChangeBlocks.length, 3, "region, rarity, and type must each update via a spread of the current filters, never a full replace");
});

test("each filter's own descriptive 'all' option is present, giving an easy way back to unfiltered for that one filter", () => {
  assert.ok(source.includes('<option value="all">כל המחוזות</option>'), "the region select's all-option must read 'כל המחוזות'");
  assert.ok(source.includes('<option value="all">כל הנדירויות</option>'), "the rarity select's all-option must read 'כל הנדירויות'");
  assert.ok(source.includes('<option value="all">כל הסוגים</option>'), "the type select's all-option must read 'כל הסוגים'");
});

test("region and rarity options are sourced from existing canonical label maps — never a hand-typed second list", () => {
  assert.ok(source.includes('import { REGION_DISPLAY_NAMES_HE } from "@/features/gyms/data/gym-labels";'));
  assert.ok(source.includes("const REGION_OPTIONS = Object.keys(REGION_DISPLAY_NAMES_HE)"));
  assert.ok(source.includes("const RARITY_OPTIONS = Object.keys(POKEMON_RARITY_LABELS)"));
});

test("type options are sourced from the canonical type-label keys, but displayed in ENGLISH via the shared battle type-label formatter — never Hebrew, never hardcoded per-species", () => {
  assert.ok(source.includes("const TYPE_OPTIONS = Object.keys(POKEMON_TYPE_LABELS)"));
  assert.ok(source.includes('import { formatPokemonTypesLabel } from "@/lib/battle/pokemonTypeLabel";'));
  assert.ok(source.includes("{formatPokemonTypesLabel([type])}"), "each type option's label must come from the shared English formatter");
});

test("party membership/highlighting is completely untouched: PartySection still renders data.party, never the filtered collection", () => {
  const partySectionStart = source.indexOf("<PartySection");
  const partySectionBlock = source.slice(partySectionStart, source.indexOf("/>", partySectionStart) + 2);
  assert.ok(partySectionBlock.includes("party={data.party}"), "the party section must keep reading the real, unfiltered party list");
});

test("starter/details behavior is untouched: the selected-Pokémon lookup still searches the full, unfiltered data.collection", () => {
  assert.ok(
    source.includes("data.collection.find((p) => p.id === selectedId)"),
    "selecting a Pokémon for its details panel must still work regardless of the current filter view"
  );
});

test("Daycare visibility rules are untouched: this component never re-derives which Pokémon are in data.collection, only which of them are shown", () => {
  assert.ok(!source.includes("getAllOwnedPokemon"), "MyPokemonContent must never call the collection-fetching service itself — that stays my-pokemon-view.service.ts's own job, untouched by this feature");
});

test("the total-owned stat pill still reports the TRUE total (data.collection.length), not the filtered count", () => {
  assert.ok(source.includes('<StatPill label="סה״כ פוקימונים" value={data.collection.length.toString()} />'));
});
