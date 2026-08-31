import { getAllEvolutionItemEvolutionEntries } from "@/data/pokemon/pokemon-evolutions";
import { speciesBelongsToRegion } from "@/data/pokemon/species-region-membership";
import type { PokemonRarity, PokemonType } from "@/shared/types/pokemon";
import type { RegionId } from "@/shared/types/region";
import type { PokedexEntryView, PokedexStatus } from "../types/pokedex.types";

// "Seen" (real Pokédex convention this filter follows) means "encountered
// at all" — caught species are a subset of seen, never excluded from it;
// "Caught" is the strictly narrower filter. "Not seen" is the complement of
// both.
export type PokedexStatusFilter = "all" | "seen" | "caught" | "not-seen";

export function matchesPokedexStatusFilter(status: PokedexStatus, filter: PokedexStatusFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "seen":
      return status !== "unseen";
    case "caught":
      return status === "caught";
    case "not-seen":
      return status === "unseen";
  }
}

export interface PokedexFilterState {
  search: string;
  status: PokedexStatusFilter;
  type: PokemonType | "all";
  rarity: PokemonRarity | "all";
  region: RegionId | "all";
  mega: boolean;
}

// POKÉDEX — REGION FILTER. One dex entry can genuinely span more than one
// region via its own `forms` array (PokedexEntryView.forms always includes
// the base species itself plus every alternate/regional Form grouped under
// the same National Dex number — e.g. Rattata's entry also carries
// "rattata-alola", which belongs to Alola while the base belongs to Kanto —
// see pokedex-view.service.ts's own doc comment). Matches this entry the
// instant ANY one of its forms belongs to the selected region
// (speciesBelongsToRegion, data/pokemon/species-region-membership.ts),
// never only the headline `entry.species` — otherwise selecting a region a
// Pokémon is ONLY represented in via one of its forms would incorrectly
// hide that entry.
function matchesPokedexRegionFilter(entry: PokedexEntryView, region: RegionId | "all"): boolean {
  if (region === "all") return true;
  return entry.forms.some((form) => speciesBelongsToRegion(form.species.id, region));
}

// POKÉDEX — MEGA FILTER ("מגה"). Shows only base dex entries for a species
// with at least one approved Mega Evolution — derived LIVE from the
// canonical Mega Stone evolution registry (data/pokemon/pokemon-evolutions.ts,
// via getAllEvolutionItemEvolutionEntries filtered to itemId === "mega-stone"),
// never a second/hardcoded list of eligible species — so a future roster
// change to that registry needs no update here. Matches via ANY of the
// entry's forms (same "a whole dex entry can span more than one of its own
// forms" pattern matchesPokedexRegionFilter above already uses), since the
// registry's own source-species id is always one of this dex entry's forms.
// Read-only: this never mutates or re-derives rarity/encounter data, and
// has nothing to do with data/encounter/rarity-config.ts.
function getMegaEligibleSpeciesIds(): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const entry of getAllEvolutionItemEvolutionEntries()) {
    if (entry.evolution.itemId === "mega-stone") ids.add(entry.speciesId);
  }
  return ids;
}

function matchesPokedexMegaFilter(entry: PokedexEntryView, mega: boolean, eligibleSpeciesIds: ReadonlySet<string>): boolean {
  if (!mega) return true;
  return entry.forms.some((form) => eligibleSpeciesIds.has(form.species.id));
}

// Pure, exported so it's directly unit-testable — extracted from
// PokedexContent's own useMemo (same "pure predicate, thin component
// consumer" split this project's other filter/rule modules already follow,
// e.g. features/party/utils/party-rules.ts, features/battle/utils/
// battle-turn-rules.ts). All entries are fetched ONCE server-side; this is
// pure client-side array filtering over that single already-loaded list —
// never a re-fetch.
//
// SEARCH — matches the real catalog name of the base species OR any of its
// alternate forms (entry.forms, same array the region filter above and the
// Pokédex detail view's form navigation both already read), regardless of
// seen/unseen status — including an entry nobody has personally encountered
// yet, and including a search by an alternate form's own name (e.g. a
// regional or Mega form), which surfaces its PARENT grouped dex entry (this
// function already only ever returns entries, one row per dex number — a
// form-name match can never produce a duplicate row). This does not reveal
// any extra information beyond the match itself: PokedexCard/PokedexDetailPanel/
// PokedexUnseenPanel still independently gate every other field on the
// entry's/form's own status, completely untouched by this predicate — a
// matched-but-unseen entry still renders as an unseen silhouette, exactly
// as if the player had scrolled to it directly. Dex number search is
// unchanged (always matches, regardless of status).
export function filterPokedexEntries(entries: readonly PokedexEntryView[], filters: PokedexFilterState): PokedexEntryView[] {
  const normalizedSearch = filters.search.trim().toLowerCase();
  const megaEligibleSpeciesIds = getMegaEligibleSpeciesIds();

  return entries.filter((entry) => {
    if (!matchesPokedexStatusFilter(entry.status, filters.status)) return false;
    if (filters.type !== "all" && !entry.species.types.includes(filters.type)) return false;
    if (filters.rarity !== "all" && entry.species.rarity !== filters.rarity) return false;
    if (!matchesPokedexRegionFilter(entry, filters.region)) return false;
    if (!matchesPokedexMegaFilter(entry, filters.mega, megaEligibleSpeciesIds)) return false;

    if (normalizedSearch) {
      const dexMatch = String(entry.species.dexNumber).includes(normalizedSearch);
      const nameMatch = entry.forms.some((form) => form.species.name.toLowerCase().includes(normalizedSearch));
      if (!dexMatch && !nameMatch) return false;
    }

    return true;
  });
}
