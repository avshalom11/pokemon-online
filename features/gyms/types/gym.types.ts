import type { PokemonType } from "@/shared/types/pokemon";
import type { RegionId } from "@/shared/types/region";

// GYMS & LEAGUES PHASE 1 — Data & Progression Foundation. This file only
// defines shapes; the actual data lives in features/gyms/data/gym-registry.ts
// and features/gyms/config/gym-level-scaling.config.ts. No battle execution,
// NPC teams, or UI exist yet — see this Phase's own scope notes in those
// files.

// The three trainer battles within a single Gym, always fought in this
// order (Easy Trainer -> Medium Trainer -> Gym Leader) — see
// GYM_BATTLE_SLOT_ORDER (gym-registry.ts) for the canonical ordering array
// every unlock check iterates over.
export type GymBattleSlotId = "easy" | "medium" | "leader";

// Generic difficulty tiers shared by every Gym/Regional Champion battle —
// deliberately NOT the same type as GymBattleSlotId (a Gym Leader battle
// maps to "hard", not "leader") since a Regional Champion battle has no
// battle slot at all but still needs a difficulty for NPC level scaling.
export type GymDifficulty = "easy" | "medium" | "hard" | "very-hard";

// The intended battle format for one battle slot (or the Regional
// Champion) — stored now so Phase 2/3 has one source of truth once actual
// battle execution is built; this Phase only stores/validates the numbers,
// it never runs a battle.
export interface GymBattleFormat {
  readonly maxPlayerPokemon: number;
  readonly npcPokemonCount: number;
  // BATTLE RESET RULE (Phase 1 spec) — every Gym/Regional Champion battle
  // is independent: the player's selected party must begin that battle at
  // full HP. Not implemented here — Phase 3 is expected to read this flag
  // as its one source of truth for whether to perform that reset, rather
  // than re-deciding the rule itself.
  readonly resetPartyToFullHpOnStart: boolean;
}

// One of the 27 Gyms — exactly 3 per region (gymNumber 1-3), each with a
// fixed elemental-type specialization per the approved design (see
// REGION_GYM_TYPES, gym-registry.ts). Gyms must be completed in numeric
// order within their region; see gym-progression-rules.ts for that logic.
export interface GymDefinition {
  // Stable id, e.g. "kanto-gym-1" — also the Gym Badge's own id (see
  // gym-badges.ts) and the region-scoped image-path segment.
  readonly id: string;
  readonly regionId: RegionId;
  readonly gymNumber: 1 | 2 | 3;
  readonly typeSpecialization: PokemonType;
}

// One of the 9 Regional Champions — exactly one per region, no type
// specialization (approved design: "Regional Champions have NO type
// specialization"), unlocked only once all 3 of that region's Gym Badges
// are earned.
export interface RegionalChampionDefinition {
  // Stable id, e.g. "kanto-champion".
  readonly id: string;
  readonly regionId: RegionId;
}
