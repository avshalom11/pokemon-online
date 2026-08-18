import { MAX_ACTIVE_TEAM_SIZE } from "@/shared/types/player";
import type { PokemonType } from "@/shared/types/pokemon";
import type { RegionId } from "@/shared/types/region";
import type {
  GymBattleFormat,
  GymBattleSlotId,
  GymDefinition,
  GymDifficulty,
  RegionalChampionDefinition,
} from "../types/gym.types";

// GYMS & LEAGUES PHASE 1 — the ONLY place a region's 3 Gym types/order and
// every battle slot's difficulty/format are defined, same "one dedicated
// tuning file, nothing else hardcodes the numbers" convention
// engine/player-level-scaling/wild-level-brackets.config.ts already
// established. A generic, data-driven foundation — not 27 separate
// hardcoded implementations: every derived export below (REGION_GYMS,
// REGIONAL_CHAMPIONS, getAllGymDefinitions, ...) is mechanically produced
// from the two small tables in this file, so adding/rebalancing a region
// later never means touching gym-progression.service.ts or any consumer.

// Always fought in this order within a Gym — every unlock check
// (gym-progression-rules.ts) iterates this array rather than re-listing
// the three slot ids by hand.
export const GYM_BATTLE_SLOT_ORDER: readonly GymBattleSlotId[] = ["easy", "medium", "leader"];

// Difficulty mapping (approved design, section 8): Easy Trainer -> easy,
// Medium Trainer -> medium, Gym Leader -> hard. A Regional Champion has no
// battle slot at all — see REGIONAL_CHAMPION_DIFFICULTY below.
export const GYM_BATTLE_SLOT_DIFFICULTY: Record<GymBattleSlotId, GymDifficulty> = {
  easy: "easy",
  medium: "medium",
  leader: "hard",
};

export const REGIONAL_CHAMPION_DIFFICULTY: GymDifficulty = "very-hard";

// Party-limit/NPC-count format per battle slot (approved design, section
// 6) — stored, never executed: no battle runs from this Phase's code.
// Gym Leader/Regional Champion both reuse MAX_ACTIVE_TEAM_SIZE (6) rather
// than repeating the literal, so a future change to the game's overall
// party cap can't silently drift out of sync with the Gym format here.
export const GYM_BATTLE_FORMATS: Record<GymBattleSlotId, GymBattleFormat> = {
  easy: { maxPlayerPokemon: 3, npcPokemonCount: 3, resetPartyToFullHpOnStart: true },
  medium: { maxPlayerPokemon: 4, npcPokemonCount: 4, resetPartyToFullHpOnStart: true },
  leader: { maxPlayerPokemon: MAX_ACTIVE_TEAM_SIZE, npcPokemonCount: MAX_ACTIVE_TEAM_SIZE, resetPartyToFullHpOnStart: true },
};

export const REGIONAL_CHAMPION_BATTLE_FORMAT: GymBattleFormat = {
  maxPlayerPokemon: MAX_ACTIVE_TEAM_SIZE,
  npcPokemonCount: MAX_ACTIVE_TEAM_SIZE,
  resetPartyToFullHpOnStart: true,
};

// The approved per-region Gym type/order table (section 3) — the single
// source every other export in this file derives from. A Record (not a
// plain array) keyed by RegionId so TypeScript enforces all 9 regions are
// covered at compile time, same "exhaustive Record" precedent
// features/regions/data/region-registry.ts already established.
const REGION_GYM_TYPES: Record<RegionId, readonly [PokemonType, PokemonType, PokemonType]> = {
  kanto: ["normal", "fire", "water"],
  johto: ["electric", "grass", "ice"],
  hoenn: ["fighting", "poison", "ground"],
  sinnoh: ["flying", "psychic", "bug"],
  unova: ["rock", "ghost", "dragon"],
  kalos: ["dark", "steel", "fairy"],
  alola: ["normal", "electric", "fighting"],
  galar: ["fire", "water", "grass"],
  paldea: ["psychic", "dark", "dragon"],
};

function buildGymId(regionId: RegionId, gymNumber: 1 | 2 | 3): string {
  return `${regionId}-gym-${gymNumber}`;
}

function buildRegionGyms(regionId: RegionId): readonly [GymDefinition, GymDefinition, GymDefinition] {
  const [gym1Type, gym2Type, gym3Type] = REGION_GYM_TYPES[regionId];
  return [
    { id: buildGymId(regionId, 1), regionId, gymNumber: 1, typeSpecialization: gym1Type },
    { id: buildGymId(regionId, 2), regionId, gymNumber: 2, typeSpecialization: gym2Type },
    { id: buildGymId(regionId, 3), regionId, gymNumber: 3, typeSpecialization: gym3Type },
  ];
}

// Every region's 3 Gyms, in fixed gymNumber order — the canonical Gym
// Registry. Derived mechanically from REGION_GYM_TYPES above, never
// hand-duplicated per region.
export const REGION_GYMS: Record<RegionId, readonly [GymDefinition, GymDefinition, GymDefinition]> = {
  kanto: buildRegionGyms("kanto"),
  johto: buildRegionGyms("johto"),
  hoenn: buildRegionGyms("hoenn"),
  sinnoh: buildRegionGyms("sinnoh"),
  unova: buildRegionGyms("unova"),
  kalos: buildRegionGyms("kalos"),
  alola: buildRegionGyms("alola"),
  galar: buildRegionGyms("galar"),
  paldea: buildRegionGyms("paldea"),
};

// One Regional Champion per region — no type specialization (approved
// design, section 3).
export const REGIONAL_CHAMPIONS: Record<RegionId, RegionalChampionDefinition> = {
  kanto: { id: "kanto-champion", regionId: "kanto" },
  johto: { id: "johto-champion", regionId: "johto" },
  hoenn: { id: "hoenn-champion", regionId: "hoenn" },
  sinnoh: { id: "sinnoh-champion", regionId: "sinnoh" },
  unova: { id: "unova-champion", regionId: "unova" },
  kalos: { id: "kalos-champion", regionId: "kalos" },
  alola: { id: "alola-champion", regionId: "alola" },
  galar: { id: "galar-champion", regionId: "galar" },
  paldea: { id: "paldea-champion", regionId: "paldea" },
};

export function getGymDefinition(regionId: RegionId, gymNumber: 1 | 2 | 3): GymDefinition {
  return REGION_GYMS[regionId][gymNumber - 1];
}

export function getRegionalChampionDefinition(regionId: RegionId): RegionalChampionDefinition {
  return REGIONAL_CHAMPIONS[regionId];
}

// Flat list of all 27 Gyms, e.g. for a future World/Region page listing or
// for tests that need to iterate every Gym regardless of region.
export function getAllGymDefinitions(): GymDefinition[] {
  return Object.values(REGION_GYMS).flat();
}

// Flat list of all 9 Regional Champions.
export function getAllRegionalChampionDefinitions(): RegionalChampionDefinition[] {
  return Object.values(REGIONAL_CHAMPIONS);
}
