import type { PokemonType } from "./pokemon";

export type ZoneId =
  | "grassland"
  | "water"
  | "cave"
  | "lava"
  | "beach"
  | "haunted-house";

export interface ZoneEncounter {
  pokemonId: string;

  minimumLevel: number;
  maximumLevel: number;

  encounterWeight: number;
}

export interface Zone {
  id: ZoneId;

  name: string;
  description: string;

  imageUrl: string;

  encounters: ZoneEncounter[];
}