import type { PokemonRarity } from "@/shared/types/pokemon";

// GYMS & LEAGUES PHASE 2 — the ONE place each trainer tier's fixed rarity
// composition is defined (approved design, section 3). Order here is only
// the order npc-team-selection.ts fills slots in — it never changes which
// species end up on a team (rarity tiers are disjoint, so fill order can't
// create cross-tier contention; see that module's own doc comment).
export const EASY_TRAINER_RARITY_TARGETS: readonly PokemonRarity[] = ["common", "common", "rare"];
export const MEDIUM_TRAINER_RARITY_TARGETS: readonly PokemonRarity[] = ["common", "rare", "rare", "rare"];
export const GYM_LEADER_RARITY_TARGETS: readonly PokemonRarity[] = [
  "rare",
  "rare",
  "very-rare",
  "very-rare",
  "very-rare",
  "legendary",
];
export const REGIONAL_CHAMPION_RARITY_TARGETS: readonly PokemonRarity[] = [
  "very-rare",
  "very-rare",
  "very-rare",
  "very-rare",
  "legendary",
  "legendary",
];
