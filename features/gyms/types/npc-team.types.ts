import type { PokemonRarity } from "@/shared/types/pokemon";
import type { RegionId } from "@/shared/types/region";
import type { GymBattleSlotId } from "./gym.types";

// GYMS & LEAGUES PHASE 2 — Fixed NPC Teams. This file only defines shapes;
// the actual fixed team data lives in features/gyms/data/gym-npc-teams.ts
// and regional-champion-teams.ts (generated once by
// scripts/generate-gym-npc-teams.ts, then checked in as static data — never
// re-selected at runtime, see that script's own doc comment). No battle
// execution, NPC AI, or persistence of a live opponent team exists yet.

// Why a species was selected for a given rarity slot — the audit trail
// section 12 of this Phase's spec asks for, kept alongside the fixed data
// itself rather than only in a one-off report:
//   A. exact target rarity + the Gym's own type
//   B. exact target rarity + any other type
//   C. one rarity tier lower + the Gym's own type
//   D. one rarity tier lower + any other type
//   E. Legendary, same region, off-type (Legendary never downgrades a
//      tier — see npc-team-selection.ts's own doc comment)
//   F. no type preference existed for this slot at all (Regional Champion
//      teams, which have no type specialization) — distinct from B/D so a
//      Champion team's selections are never misread as "a fallback was
//      needed" when no type constraint ever applied in the first place.
export type NpcTeamSlotFallbackTier =
  | "exact-rarity-matching-type"
  | "exact-rarity-off-type"
  | "lower-rarity-matching-type"
  | "lower-rarity-off-type"
  | "legendary-same-region-off-type"
  | "no-type-preference";

export interface NpcTeamMember {
  readonly speciesId: string;
  readonly targetRarity: PokemonRarity;
  readonly fallbackTier: NpcTeamSlotFallbackTier;
}

export interface GymNpcTeamDefinition {
  readonly regionId: RegionId;
  readonly gymNumber: 1 | 2 | 3;
  readonly battleSlot: GymBattleSlotId;
  readonly members: readonly NpcTeamMember[];
}

export interface RegionalChampionTeamDefinition {
  readonly regionId: RegionId;
  readonly members: readonly NpcTeamMember[];
}
