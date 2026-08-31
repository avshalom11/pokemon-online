import type { ChestTypeId } from "@/features/chests/data/chest-definitions";
import type { PokemonRarity } from "@/shared/types/pokemon";
import { leagueAwardImageUrl } from "./league-achievement-media";
import { CHAMPIONS_LEAGUE, LEAGUE_I, LEAGUE_II, LEAGUE_III } from "./league-registry";
import type { LeagueId } from "../types/league.types";

// GYMS & LEAGUES PHASE 8 — the ONE central, data-driven League reward
// registry (section 9). Every number below is taken verbatim from this
// Phase's own approved numbers (sections 11-14) — never re-derived or
// eyeballed. Both the actual grant logic (league-reward.service.ts) and
// any future Phase 9 reward-preview UI read this SAME registry — there is
// no second copy of any of these numbers anywhere else in the codebase,
// same "one source of truth" precedent gym-reward-registry.ts already
// established for Gym rewards.

export interface LeagueChestReward {
  readonly chestTypeId: ChestTypeId;
  readonly quantity: number;
}

export interface LeagueEggReward {
  readonly rarity: PokemonRarity;
  readonly quantity: number;
}

// REWARD EXCLUSIVITY (section 15) — a placement reward definition exists
// ONLY for place 1/2/3; there is no 4th place entry, by construction —
// every other real participant instead reads
// LeagueParticipationRewardDefinition, never both.
export interface LeaguePlacementRewardDefinition {
  readonly leagueId: LeagueId;
  readonly place: 1 | 2 | 3;
  readonly money: number;
  readonly xpPercentOfNextLevel: number;
  readonly gold: number;
  readonly chestRewards: readonly LeagueChestReward[];
  // The permanent achievement this place awards (section 20/21) — a
  // display label + deterministic image path; the actual persistence is
  // Phase 7's own LeagueTournamentPlacement row (see
  // league-achievement.service.ts), never a second achievement table.
  readonly achievementLabel: string;
  readonly achievementImageUrl: string;
}

export interface LeagueParticipationRewardDefinition {
  readonly leagueId: LeagueId;
  readonly money: number;
  readonly eggRewards: readonly LeagueEggReward[];
}

interface PlaceRewardRow {
  readonly money: number;
  readonly xpPercentOfNextLevel: number;
  readonly gold: number;
  readonly chestRewards: readonly LeagueChestReward[];
}

interface LeagueRewardTable {
  readonly displayName: string;
  readonly places: Readonly<Record<1 | 2 | 3, PlaceRewardRow>>;
  readonly participation: { readonly money: number; readonly eggRewards: readonly LeagueEggReward[] };
}

const REWARD_TABLE: Record<LeagueId, LeagueRewardTable> = {
  "league-1": {
    displayName: LEAGUE_I.displayName,
    places: {
      1: { money: 10_000, xpPercentOfNextLevel: 50, gold: 100, chestRewards: [{ chestTypeId: "gold", quantity: 1 }] },
      2: { money: 7_000, xpPercentOfNextLevel: 35, gold: 50, chestRewards: [{ chestTypeId: "silver", quantity: 1 }] },
      3: { money: 4_000, xpPercentOfNextLevel: 25, gold: 20, chestRewards: [{ chestTypeId: "silver", quantity: 1 }] },
    },
    participation: { money: 1_000, eggRewards: [{ rarity: "common", quantity: 1 }] },
  },
  "league-2": {
    displayName: LEAGUE_II.displayName,
    places: {
      1: { money: 15_000, xpPercentOfNextLevel: 50, gold: 150, chestRewards: [{ chestTypeId: "gold", quantity: 2 }] },
      2: { money: 10_000, xpPercentOfNextLevel: 35, gold: 100, chestRewards: [{ chestTypeId: "gold", quantity: 1 }] },
      3: { money: 7_000, xpPercentOfNextLevel: 25, gold: 50, chestRewards: [{ chestTypeId: "silver", quantity: 1 }] },
    },
    participation: { money: 3_000, eggRewards: [{ rarity: "common", quantity: 1 }] },
  },
  "league-3": {
    displayName: LEAGUE_III.displayName,
    places: {
      1: { money: 20_000, xpPercentOfNextLevel: 50, gold: 200, chestRewards: [{ chestTypeId: "diamond", quantity: 1 }] },
      2: { money: 15_000, xpPercentOfNextLevel: 35, gold: 150, chestRewards: [{ chestTypeId: "gold", quantity: 2 }] },
      3: { money: 10_000, xpPercentOfNextLevel: 25, gold: 100, chestRewards: [{ chestTypeId: "silver", quantity: 2 }] },
    },
    participation: { money: 4_000, eggRewards: [{ rarity: "rare", quantity: 1 }] },
  },
  "champions-league": {
    displayName: CHAMPIONS_LEAGUE.displayName,
    places: {
      1: { money: 30_000, xpPercentOfNextLevel: 50, gold: 400, chestRewards: [{ chestTypeId: "diamond", quantity: 2 }] },
      2: {
        money: 20_000,
        xpPercentOfNextLevel: 35,
        gold: 200,
        chestRewards: [
          { chestTypeId: "gold", quantity: 2 },
          { chestTypeId: "silver", quantity: 2 },
        ],
      },
      3: { money: 15_000, xpPercentOfNextLevel: 25, gold: 150, chestRewards: [{ chestTypeId: "gold", quantity: 2 }] },
    },
    // IMPORTANT — approved workbook: Common Egg x1 + Rare Egg x1 + Money 5000.
    participation: {
      money: 5_000,
      eggRewards: [
        { rarity: "common", quantity: 1 },
        { rarity: "rare", quantity: 1 },
      ],
    },
  },
};

export function getLeaguePlacementRewardDefinition(leagueId: LeagueId, place: 1 | 2 | 3): LeaguePlacementRewardDefinition {
  const table = REWARD_TABLE[leagueId];
  const row = table.places[place];
  const achievementLabel = place === 1 ? `${table.displayName} Trophy` : place === 2 ? "Silver Medal" : "Bronze Medal";
  const achievementImageUrl = leagueAwardImageUrl(leagueId, place);

  return {
    leagueId,
    place,
    money: row.money,
    xpPercentOfNextLevel: row.xpPercentOfNextLevel,
    gold: row.gold,
    chestRewards: row.chestRewards,
    achievementLabel,
    achievementImageUrl,
  };
}

export function getLeagueParticipationRewardDefinition(leagueId: LeagueId): LeagueParticipationRewardDefinition {
  const table = REWARD_TABLE[leagueId];
  return { leagueId, money: table.participation.money, eggRewards: table.participation.eggRewards };
}

export function getAllLeaguePlacementRewardDefinitions(): LeaguePlacementRewardDefinition[] {
  return (Object.keys(REWARD_TABLE) as LeagueId[]).flatMap((leagueId) =>
    ([1, 2, 3] as const).map((place) => getLeaguePlacementRewardDefinition(leagueId, place))
  );
}
