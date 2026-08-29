import { speciesBelongsToRegion } from "@/data/pokemon/species-region-membership";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { PokemonRarity, PokemonType } from "@/shared/types/pokemon";
import type { RegionId } from "@/shared/types/region";

export interface MyPokemonFilterState {
  region: RegionId | "all";
  rarity: PokemonRarity | "all";
  type: PokemonType | "all";
}

export const ALL_MY_POKEMON_FILTERS: MyPokemonFilterState = { region: "all", rarity: "all", type: "all" };

// MY POKÉMON — REGION / RARITY / TYPE FILTERS. Pure, exported so it's
// directly unit-testable (same "pure predicate, thin component consumer"
// split this project's other filter/rule modules already follow, e.g.
// features/pokedex/utils/pokedex-filters.ts, features/party/utils/
// party-rules.ts). `collection` is already the page's own once-loaded,
// Daycare-excluded list (features/pokemon/services/my-pokemon-view.service.ts's
// getAllOwnedPokemon) — this never re-fetches or changes which Pokémon are
// IN that list, only which of them are currently shown; party membership,
// starter status, and Daycare exclusion are therefore completely
// unaffected, since every filtered-in item is the exact same object the
// page already had.
//
// Type matching reuses the species' own types[] via .includes — a
// dual-type Pokémon matches a type filter selecting EITHER of its two
// types, never requiring both. Region matching reuses
// speciesBelongsToRegion (data/pokemon/species-region-membership.ts) — the
// exact same "any of this species' valid regions" rule the Pokédex's own
// region filter uses, so "region" means the same thing on both screens.
export function filterMyPokemonCollection(collection: readonly OwnedPokemon[], filters: MyPokemonFilterState): OwnedPokemon[] {
  return collection.filter((pokemon) => {
    if (filters.region !== "all" && !speciesBelongsToRegion(pokemon.species.id, filters.region)) return false;
    if (filters.rarity !== "all" && pokemon.species.rarity !== filters.rarity) return false;
    if (filters.type !== "all" && !pokemon.species.types.includes(filters.type)) return false;
    return true;
  });
}
