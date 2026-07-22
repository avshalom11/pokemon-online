import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import type { PokemonSpecies } from "@/shared/types/pokemon";

// Thin lookup helpers over the single species catalog (data/pokemon/pokemon-data.ts)
// so consumers never read POKEMON_DATA directly and duplicate the "how do I
// find a species" logic.
export function getSpeciesById(speciesId: string): PokemonSpecies | undefined {
  return POKEMON_DATA.find((species) => species.id === speciesId);
}

export function getStarterSpecies(): PokemonSpecies[] {
  return POKEMON_DATA.filter((species) => species.isStarter);
}
