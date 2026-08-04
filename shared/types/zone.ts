import type { PokemonType } from "./pokemon";

export type ZoneId =
  | "grassland"
  | "water"
  | "cave"
  | "lava"
  | "beach"
  | "haunted-house";

// Every known zone id, independent of any one region's own data — the same
// six ids exist in every region that has zone data at all (Kanto and Johto
// today), each with its own separate Pokémon pool (see data/zones/
// zone-data.ts's getZoneData). Used for validating that a string is
// STRUCTURALLY a real zone id (e.g. app/(game)/battle/page.tsx,
// features/battle-session/services/battle-session.service.ts's own
// isValidZoneId) — never for resolving an actual encounter pool, which
// always also needs a RegionId.
export const ALL_ZONE_IDS: readonly ZoneId[] = ["grassland", "water", "cave", "lava", "beach", "haunted-house"];

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

  recommendedTypes?: PokemonType[];

  encounters: ZoneEncounter[];
}