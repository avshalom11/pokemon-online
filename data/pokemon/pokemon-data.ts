import { GENERATION_1_POKEMON_DATA } from "./generation-1-pokemon-data";
import { GENERATION_2_POKEMON_DATA } from "./generation-2-pokemon-data";
import { GENERATION_3_POKEMON_DATA } from "./generation-3-pokemon-data";
import { GENERATION_4_POKEMON_DATA } from "./generation-4-pokemon-data";
import { GENERATION_5_POKEMON_DATA } from "./generation-5-pokemon-data";
import type { PokemonSpecies } from "@/shared/types/pokemon";

// The canonical Pokémon species registry — every generation's catalog,
// concatenated. This is the ONE species catalog for the whole project
// (species-catalog.ts, the Pokédex, the encounter engine, and every test
// all read this same export); adding a new generation means adding one
// entry here, never a second/competing catalog.
export const POKEMON_DATA: PokemonSpecies[] = [
  ...GENERATION_1_POKEMON_DATA,
  ...GENERATION_2_POKEMON_DATA,
  ...GENERATION_3_POKEMON_DATA,
  ...GENERATION_4_POKEMON_DATA,
  ...GENERATION_5_POKEMON_DATA,
];
