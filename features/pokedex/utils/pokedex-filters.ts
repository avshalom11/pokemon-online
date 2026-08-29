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

// Pure, exported so it's directly unit-testable — extracted from
// PokedexContent's own useMemo (same "pure predicate, thin component
// consumer" split this project's other filter/rule modules already follow,
// e.g. features/party/utils/party-rules.ts, features/battle/utils/
// battle-turn-rules.ts). All entries are fetched ONCE server-side; this is
// pure client-side array filtering over that single already-loaded list —
// never a re-fetch. Search only ever matches text a card already shows (dex
// number always, name only once seen) — never a hidden species' real name,
// so typing a guess can't leak whether an unseen entry matches.
export function filterPokedexEntries(entries: readonly PokedexEntryView[], filters: PokedexFilterState): PokedexEntryView[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return entries.filter((entry) => {
    if (!matchesPokedexStatusFilter(entry.status, filters.status)) return false;
    if (filters.type !== "all" && !entry.species.types.includes(filters.type)) return false;
    if (filters.rarity !== "all" && entry.species.rarity !== filters.rarity) return false;
    if (!matchesPokedexRegionFilter(entry, filters.region)) return false;

    if (normalizedSearch) {
      const dexMatch = String(entry.species.dexNumber).includes(normalizedSearch);
      const nameMatch = entry.status !== "unseen" && entry.species.name.toLowerCase().includes(normalizedSearch);
      if (!dexMatch && !nameMatch) return false;
    }

    return true;
  });
}
