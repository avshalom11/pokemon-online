import type { ChestTypeId } from "@/features/chests/data/chest-definitions";
import type { RegionId } from "@/shared/types/region";
import { getGymBadgeDefinition } from "./gym-badges";
import { REGION_GYMS, REGIONAL_CHAMPIONS } from "./gym-registry";
import { getRegionalMedalDefinition } from "./regional-medals";

// GYMS & LEAGUES PHASE 4 — the ONE central, data-driven reward registry
// (section 16 of this Phase's spec). Every number below is taken verbatim
// from the latest APPROVED Excel reward workbook (this Phase's own "source
// of truth" instructions), never re-derived or eyeballed. Both the
// battle-completion service (gym-reward.service.ts, which actually grants
// these) and the UI's reward-preview component read this SAME registry —
// there is no second copy of any of these numbers anywhere else in the
// codebase.
//
// Easy Trainer and Medium Trainer battles have NO entry here at all — this
// Phase's own reward rule is "no numeric/final reward" for those, so there
// is nothing for this registry to define for them; only Gym Leader
// (battleSlot "leader") and Regional Champion victories ever consume it.

export interface GymChestReward {
  readonly chestTypeId: ChestTypeId;
  readonly quantity: number;
}

export interface GymRewardDefinition {
  readonly gymId: string;
  readonly regionId: RegionId;
  readonly gymNumber: 1 | 2 | 3;
  readonly money: number;
  // Percentage of the XP required to advance the player from their CURRENT
  // level to the NEXT level (section 13) — never a percentage of total
  // lifetime XP. The concrete amount is only ever computed at grant time
  // (gym-reward.service.ts's calculateGymRewardXp), from the player's real
  // level at that moment — never stored here as a fixed number.
  readonly xpPercentOfNextLevel: number;
  // Cross-reference only (display/lookup convenience) — the actual Badge
  // award still happens exclusively through markGymBattleCompleted's own
  // Phase 1 primitive; this registry never awards anything itself.
  readonly badgeId: string;
}

export interface RegionalChampionRewardDefinition {
  readonly regionId: RegionId;
  readonly money: number;
  readonly xpPercentOfNextLevel: number;
  readonly chestRewards: readonly GymChestReward[];
  // Cross-reference only — see GymRewardDefinition.badgeId's own note above;
  // the real Medal award stays exclusively markRegionalChampionDefeated's
  // job.
  readonly medalId: string;
}

// One (money, xpPercent) pair per Gym, in gymNumber order — exactly the
// approved workbook's own per-region table (section 14). Mechanically
// turned into full GymRewardDefinition entries below via REGION_GYMS
// (gym-registry.ts), the same "one small tuning table, everything else
// derived" convention that file itself established for Gym types.
const GYM_REWARD_TABLE: Record<RegionId, readonly [[number, number], [number, number], [number, number]]> = {
  kanto: [
    [500, 10],
    [800, 20],
    [1000, 30],
  ],
  johto: [
    [800, 10],
    [1000, 20],
    [1300, 30],
  ],
  hoenn: [
    [1000, 15],
    [1300, 25],
    [1500, 35],
  ],
  sinnoh: [
    [1300, 15],
    [1500, 25],
    [1800, 35],
  ],
  unova: [
    [1500, 15],
    [1800, 25],
    [2000, 35],
  ],
  kalos: [
    [1800, 15],
    [2000, 25],
    [2300, 35],
  ],
  alola: [
    [2000, 15],
    [2300, 25],
    [2500, 35],
  ],
  galar: [
    [2300, 15],
    [2500, 25],
    [2800, 35],
  ],
  paldea: [
    [2500, 15],
    [2800, 25],
    [3000, 35],
  ],
};

function buildGymRewardDefinition(regionId: RegionId, gymNumber: 1 | 2 | 3): GymRewardDefinition {
  const gym = REGION_GYMS[regionId][gymNumber - 1];
  const [money, xpPercentOfNextLevel] = GYM_REWARD_TABLE[regionId][gymNumber - 1];
  return {
    gymId: gym.id,
    regionId,
    gymNumber,
    money,
    xpPercentOfNextLevel,
    badgeId: getGymBadgeDefinition(regionId, gymNumber).id,
  };
}

export function getGymRewardDefinition(regionId: RegionId, gymNumber: 1 | 2 | 3): GymRewardDefinition {
  return buildGymRewardDefinition(regionId, gymNumber);
}

// Exact per-region Regional Champion rewards (section 15). IMPORTANT — the
// latest approved Excel reward workbook is the source of truth here, not
// any earlier conversation's numbers: Paldea grants Gold Chest x1 + Silver
// Chest x2 and explicitly NO Diamond Chest.
const REGIONAL_CHAMPION_REWARD_TABLE: Record<RegionId, { money: number; xpPercentOfNextLevel: number; chestRewards: readonly GymChestReward[] }> = {
  kanto: { money: 2000, xpPercentOfNextLevel: 40, chestRewards: [{ chestTypeId: "silver", quantity: 1 }] },
  johto: { money: 2500, xpPercentOfNextLevel: 40, chestRewards: [{ chestTypeId: "silver", quantity: 1 }] },
  hoenn: { money: 3000, xpPercentOfNextLevel: 50, chestRewards: [{ chestTypeId: "silver", quantity: 1 }] },
  sinnoh: { money: 3500, xpPercentOfNextLevel: 50, chestRewards: [{ chestTypeId: "gold", quantity: 1 }] },
  unova: { money: 4000, xpPercentOfNextLevel: 50, chestRewards: [{ chestTypeId: "gold", quantity: 1 }] },
  kalos: { money: 4500, xpPercentOfNextLevel: 50, chestRewards: [{ chestTypeId: "gold", quantity: 1 }] },
  alola: {
    money: 5000,
    xpPercentOfNextLevel: 50,
    chestRewards: [
      { chestTypeId: "gold", quantity: 1 },
      { chestTypeId: "silver", quantity: 2 },
    ],
  },
  galar: {
    money: 5500,
    xpPercentOfNextLevel: 50,
    chestRewards: [
      { chestTypeId: "gold", quantity: 1 },
      { chestTypeId: "silver", quantity: 2 },
    ],
  },
  // PALDEA — approved workbook: Gold Chest x1 + Silver Chest x2. NO Diamond
  // Chest. Do not add one here without a new, explicitly approved workbook
  // update.
  paldea: {
    money: 6000,
    xpPercentOfNextLevel: 50,
    chestRewards: [
      { chestTypeId: "gold", quantity: 1 },
      { chestTypeId: "silver", quantity: 2 },
    ],
  },
};

function buildRegionalChampionRewardDefinition(regionId: RegionId): RegionalChampionRewardDefinition {
  const table = REGIONAL_CHAMPION_REWARD_TABLE[regionId];
  return {
    regionId,
    money: table.money,
    xpPercentOfNextLevel: table.xpPercentOfNextLevel,
    chestRewards: table.chestRewards,
    medalId: getRegionalMedalDefinition(regionId).id,
  };
}

export function getRegionalChampionRewardDefinition(regionId: RegionId): RegionalChampionRewardDefinition {
  return buildRegionalChampionRewardDefinition(regionId);
}

// Flat lists for the UI's reward-preview needs (e.g. a future admin/QA
// screen, or exhaustive tests) — mechanically derived, never hand-repeated.
export function getAllGymRewardDefinitions(): GymRewardDefinition[] {
  return Object.keys(REGION_GYMS).flatMap((regionId) =>
    ([1, 2, 3] as const).map((gymNumber) => buildGymRewardDefinition(regionId as RegionId, gymNumber))
  );
}

export function getAllRegionalChampionRewardDefinitions(): RegionalChampionRewardDefinition[] {
  return Object.keys(REGIONAL_CHAMPIONS).map((regionId) => buildRegionalChampionRewardDefinition(regionId as RegionId));
}
