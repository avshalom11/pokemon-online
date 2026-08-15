import { getEggImagePath } from "@/features/eggs/media/egg-media-paths";
import type { PokemonRarity } from "@/shared/types/pokemon";

export interface EggDefinition {
  // Deliberately its own field, distinct from `rarity` below, even though
  // every Phase 1 egg's id and rarity are the same value — an egg "type"
  // and its rarity happen to be a 1:1 axis today, but keeping them as
  // separate named fields (matching the task's own literal id/rarity split)
  // means a future non-rarity-keyed egg type never has to reshape this
  // interface, only add a row where the two values differ.
  id: PokemonRarity;
  displayName: string;
  rarity: PokemonRarity;
  // Battles needed to hatch this egg in the STANDARD incubator specifically
  // (speedMultiplier 1, features/eggs/data/incubator-definitions.ts) — the
  // one true baseline every other incubator's own target is derived from at
  // incubation-start time (features/eggs/services/incubation.service.ts),
  // never duplicated or re-hardcoded anywhere else. Egg rarity maps to
  // Pokémon REAL rarity (PokemonSpecies.rarity), never effective encounter
  // rarity — see this field's own name (Standard, not "base") and the
  // schema's own PlayerOwnedEgg doc comment.
  requiredBattlesStandard: number;
  imageUrl: string;
}

// The one source of truth for every egg type's static facts — required
// battle counts in particular are never hardcoded a second time anywhere
// else (services, UI). Exactly 4 entries, one per PokemonRarity value
// (shared/types/pokemon.ts) — no duplicate rarity concept invented here.
// Drop probabilities (the eventual 70/20/8/2 roll) are explicitly Phase 2 —
// this table has no weight/probability field yet.
export const EGG_DEFINITIONS: readonly EggDefinition[] = [
  {
    id: "common",
    displayName: "ביצה רגילה",
    rarity: "common",
    requiredBattlesStandard: 400,
    imageUrl: getEggImagePath("common"),
  },
  {
    id: "rare",
    displayName: "ביצה נדירה",
    rarity: "rare",
    requiredBattlesStandard: 600,
    imageUrl: getEggImagePath("rare"),
  },
  {
    id: "very-rare",
    displayName: "ביצה נדירה מאוד",
    rarity: "very-rare",
    requiredBattlesStandard: 1000,
    imageUrl: getEggImagePath("very-rare"),
  },
  {
    id: "legendary",
    displayName: "ביצה אגדית",
    rarity: "legendary",
    requiredBattlesStandard: 1500,
    imageUrl: getEggImagePath("legendary"),
  },
];

export function getEggDefinition(rarity: PokemonRarity): EggDefinition {
  const definition = EGG_DEFINITIONS.find((candidate) => candidate.id === rarity);
  if (!definition) {
    throw new Error(`No egg definition exists for rarity "${rarity}"`);
  }
  return definition;
}
