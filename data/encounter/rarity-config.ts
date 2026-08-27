import type { PokemonRarity } from "@/shared/types/pokemon";

// The ONLY place wild-encounter rarity-tier probabilities are defined.
// engine/encounter/pokemon-encounter-engine.ts reads these values and never
// hardcodes a distribution itself — change the numbers here to retune how
// often each rarity tier is picked in Stage 1 of encounter selection.
//
// These are RELATIVE weights, not required to sum to 100 (same convention
// ZoneEncounter.encounterWeight already uses elsewhere in this project) —
// a rarity's actual chance is its own value divided by the sum of all four.
// Every PokemonRarity value (shared/types/pokemon.ts) must have an entry;
// TypeScript enforces that via the Record type below.
//
// Placeholder starting values — common most likely, legendary rarest, in
// the same relative order as the game's own rarity ladder. Tune freely;
// nothing else needs to change when these numbers change.
export const RARITY_ENCOUNTER_PROBABILITIES: Record<PokemonRarity, number> = {
  common: 79.15,
  rare: 20,
  "very-rare": 0.6,
  legendary: 0.25,
};
