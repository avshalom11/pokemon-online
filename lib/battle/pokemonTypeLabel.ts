import type { PokemonType } from "@/shared/types/pokemon";

// BATTLE UI — TYPE DISPLAY. The one place a Pokémon's canonical types[]
// (never a second/hardcoded per-species list) is turned into the label
// shown under its name in battle — e.g. "Electric" (single type) or
// "Fire / Flying" (dual type, original data order preserved). Deliberately
// English, capitalized (Title Case) — never POKEMON_TYPE_LABELS
// (shared/types/pokemon-labels.ts), which is Hebrew and used by every other
// type badge in this project (Pokédex, PokemonCard, ...); this is the one
// intentional exception. A pure formatter over whatever types[] it's given,
// so it's automatically correct for any species/form without ever needing a
// new case added here.
export function formatPokemonTypesLabel(types: readonly PokemonType[]): string {
  return types.map((type) => `${type.charAt(0).toUpperCase()}${type.slice(1)}`).join(" / ");
}
