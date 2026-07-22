import type { PokemonSpecies } from "./pokemon";

// The battle engine's runtime shape: a species hydrated with its owner's
// progression. Distinct from the persisted PlayerPokemon Prisma model, which
// stores only speciesId plus progression fields — this type is what a
// PlayerPokemon row looks like once joined against the species catalog for
// actual gameplay use (battle, team display, etc).
export interface BattlePokemon {
  id: string;

  species: PokemonSpecies;

  nickname?: string;

  level: number;
  experience: number;

  currentHealth: number;

  isShiny: boolean;

  moveIds: string[];
}
