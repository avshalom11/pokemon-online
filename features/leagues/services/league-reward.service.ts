import "server-only";

import { grantChest } from "@/features/chests/services/chest-ownership.service";
import { grantCurrencyRewards } from "@/features/currency/services/currency-reward.service";
import type { CurrencyReward } from "@/features/currency/types/currency.types";
import { createOwnedEgg } from "@/features/eggs/services/egg-ownership.service";
import { getXpRequiredForNextLevel } from "@/features/player-progression/progression-calculations";
import { addPlayerExperience } from "@/features/player-progression/progression-service";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { toRegionId } from "@/shared/types/region";
import {
  getLeagueParticipationRewardDefinition,
  getLeaguePlacementRewardDefinition,
  type LeagueChestReward,
  type LeagueEggReward,
} from "../data/league-reward-registry";
import type { LeagueId } from "../types/league.types";

// GYMS & LEAGUES PHASE 8 — the ONE place a completed League tournament is
// turned into actual grants against a player's real currency/XP/chest/egg
// inventory (section 23). Every number this reads comes from
// league-reward-registry.ts (the single source of truth also read by any
// future Phase 9 reward-preview UI) — this file never hardcodes an amount
// itself.
//
// EXACTLY-ONCE (section 22) — the very first write inside the transaction
// is a guarded updateMany on LeagueTournament.rewardsGrantedAt (null ->
// now); only the caller whose updateMany actually claims it (count > 0)
// ever proceeds to grant anything. This is deliberately NOT
// `status === "completed"` (multiple processes could race around
// completion itself) — a dedicated, separate claim column.
//
// REWARD EXCLUSIVITY (section 15/16) — every participant in the tournament
// receives EXACTLY ONE reward: Top-3 placements read
// LeaguePlacementRewardDefinition; every other REAL participant (win or
// lose any match — participation never depends on match wins) reads
// LeagueParticipationRewardDefinition; a computer participant is skipped
// entirely (participantType !== "player", or playerId null) — it is never
// eligible for either reward.

// XP RULE (section 10) — same "percentage of current-level -> next-level
// XP" rule Gym rewards already established (gym-reward.service.ts's own
// calculateGymRewardXp), reusing the SAME single XP curve
// (getXpRequiredForNextLevel) — never a second formula.
export function calculateLeagueRewardXp(currentLevel: number, xpPercentOfNextLevel: number): number {
  const requiredXp = getXpRequiredForNextLevel(currentLevel);
  return Math.max(0, Math.floor((requiredXp * xpPercentOfNextLevel) / 100));
}

async function currentPlayerLevel(tx: Prisma.TransactionClient, playerId: string): Promise<number> {
  const profile = await tx.playerProfile.findUniqueOrThrow({ where: { id: playerId }, select: { level: true } });
  return profile.level;
}

export interface GrantedLeaguePlayerReward {
  readonly playerId: string;
  readonly kind: "placement" | "participation";
  readonly place?: 1 | 2 | 3;
  readonly money: number;
  readonly gold: number;
  readonly xpAmount: number;
  readonly newPlayerLevel: number;
  readonly chestRewards: readonly LeagueChestReward[];
  readonly eggRewards: readonly LeagueEggReward[];
  readonly achievementLabel?: string;
}

async function grantPlacementReward(
  tx: Prisma.TransactionClient,
  playerId: string,
  leagueId: LeagueId,
  place: 1 | 2 | 3
): Promise<GrantedLeaguePlayerReward> {
  const definition = getLeaguePlacementRewardDefinition(leagueId, place);
  const level = await currentPlayerLevel(tx, playerId);
  const xpAmount = calculateLeagueRewardXp(level, definition.xpPercentOfNextLevel);

  // MONEY / GOLD (section 19) — two independent currencies; both may
  // appear in the same reward, never confused with a Gold Chest.
  const currencyRewards: CurrencyReward[] = [{ type: "money", amount: definition.money }];
  if (definition.gold > 0) currencyRewards.push({ type: "gold", amount: definition.gold });
  await grantCurrencyRewards(tx, playerId, currencyRewards);

  const levelUpResult = await addPlayerExperience(tx, playerId, xpAmount);

  for (const chest of definition.chestRewards) {
    await grantChest(tx, playerId, chest.chestTypeId, chest.quantity);
  }

  return {
    playerId,
    kind: "placement",
    place,
    money: definition.money,
    gold: definition.gold,
    xpAmount,
    newPlayerLevel: levelUpResult.newLevel,
    chestRewards: definition.chestRewards,
    eggRewards: [],
    achievementLabel: definition.achievementLabel,
  };
}

async function grantParticipationReward(tx: Prisma.TransactionClient, playerId: string, leagueId: LeagueId): Promise<GrantedLeaguePlayerReward> {
  const definition = getLeagueParticipationRewardDefinition(leagueId);

  await grantCurrencyRewards(tx, playerId, [{ type: "money", amount: definition.money }]);

  // EGG REWARDS (section 17) — the existing generic createOwnedEgg
  // primitive, never a League-specific egg table; regionId is the
  // player's own CURRENT region at grant time, the same established rule
  // chest-open.service.ts's own egg rewards already follow.
  const profile = await tx.playerProfile.findUniqueOrThrow({ where: { id: playerId }, select: { regionId: true } });
  const regionId = toRegionId(profile.regionId);
  for (const egg of definition.eggRewards) {
    for (let i = 0; i < egg.quantity; i++) {
      await createOwnedEgg(tx, playerId, egg.rarity, regionId, "league");
    }
  }

  const level = await currentPlayerLevel(tx, playerId);

  return {
    playerId,
    kind: "participation",
    money: definition.money,
    gold: 0,
    xpAmount: 0,
    newPlayerLevel: level,
    chestRewards: [],
    eggRewards: definition.eggRewards,
  };
}

export type GrantCompletedLeagueTournamentRewardsResult =
  | { status: "not-completed" }
  | { status: "already-granted" }
  | { status: "granted"; results: readonly GrantedLeaguePlayerReward[] };

// REWARD DISTRIBUTION TRIGGER (section 23) — the one reusable primitive:
// verify completed -> read placements -> enumerate real participants ->
// placement XOR participation -> grant everything transactionally ->
// record the claim -> return a structured result. Never invoked from
// React.
export async function grantCompletedLeagueTournamentRewards(tournamentId: string): Promise<GrantCompletedLeagueTournamentRewardsResult> {
  const tournament = await prisma.leagueTournament.findUniqueOrThrow({ where: { id: tournamentId } });
  if (tournament.status !== "completed") return { status: "not-completed" };

  const leagueId = tournament.leagueId as LeagueId;

  const results = await prisma.$transaction(async (tx) => {
    const claimed = await tx.leagueTournament.updateMany({
      where: { id: tournamentId, rewardsGrantedAt: null },
      data: { rewardsGrantedAt: new Date() },
    });
    if (claimed.count === 0) return null;

    const [placements, participants] = await Promise.all([
      tx.leagueTournamentPlacement.findMany({ where: { tournamentId } }),
      tx.leagueTournamentParticipant.findMany({ where: { tournamentId } }),
    ]);

    const placedParticipantIds = new Set(placements.map((placement) => placement.participantId));
    const granted: GrantedLeaguePlayerReward[] = [];

    for (const placement of placements) {
      granted.push(await grantPlacementReward(tx, placement.playerId, leagueId, placement.place as 1 | 2 | 3));
    }

    for (const participant of participants) {
      // COMPUTER FILLER (section 16) — never reward-eligible, placement or
      // participation, regardless of anything else.
      if (participant.participantType !== "player" || !participant.playerId) continue;
      if (placedParticipantIds.has(participant.id)) continue;
      granted.push(await grantParticipationReward(tx, participant.playerId, leagueId));
    }

    return granted;
  });

  if (results === null) return { status: "already-granted" };
  return { status: "granted", results };
}
