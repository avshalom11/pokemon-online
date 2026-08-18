import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getLeaguePlacementRewardDefinition } from "../data/league-reward-registry";
import type { LeagueId } from "../types/league.types";

// GYMS & LEAGUES PHASE 8 — Trophy/Medal persistence + current-champion
// query foundation (sections 20/21). Deliberately NOT a new Prisma model:
// Phase 7's own LeagueTournamentPlacement (one row per (tournamentId,
// place), immutable, never overwritten) already IS exactly the
// "tournament-specific achievement history" this Phase's own spec asks
// for — a player who wins multiple cycles simply accumulates multiple
// rows, never a single boolean that would prevent a future win from being
// recorded. "Trophy" vs "Medal" is purely a DISPLAY label + image path,
// derived from (leagueId, place) via the same reward registry the actual
// grant logic reads (league-reward-registry.ts) — one source of truth,
// never a second copy of the label text.

export interface LeagueChampionSummary {
  readonly leagueId: LeagueId;
  readonly playerId: string;
  readonly tournamentId: string;
  readonly weekKey: string;
  readonly achievedAt: Date;
}

// CURRENT CHAMPION (section 21) — the newest COMPLETED tournament's own
// place=1 winner for `leagueId`. weekKey sorts identically to calendar
// date (YYYY-MM-DD), so a plain string comparison is sufficient — no
// separate "most recent" timestamp column needed.
export async function getCurrentLeagueChampion(leagueId: LeagueId): Promise<LeagueChampionSummary | null> {
  const tournaments = await prisma.leagueTournament.findMany({ where: { leagueId, status: "completed" } });
  if (tournaments.length === 0) return null;

  const latest = [...tournaments].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0];
  const placements = await prisma.leagueTournamentPlacement.findMany({ where: { tournamentId: latest.id, place: 1 } });
  const championPlacement = placements[0];
  if (!championPlacement) return null;

  return {
    leagueId,
    playerId: championPlacement.playerId,
    tournamentId: latest.id,
    weekKey: latest.weekKey,
    achievedAt: championPlacement.createdAt,
  };
}

export interface LeaguePlayerAchievement {
  readonly leagueId: LeagueId;
  readonly place: 1 | 2 | 3;
  readonly tournamentId: string;
  readonly weekKey: string;
  readonly achievementLabel: string;
  readonly achievementImageUrl: string;
  readonly achievedAt: Date;
}

// The player's own FULL Trophy/Medal history — every placement they have
// ever earned, across every League and every cycle, oldest to newest.
// Never a single "current" slot; a player who won League I twice (in two
// different cycles) sees BOTH wins here.
export async function getPlayerLeagueAchievements(playerId: string): Promise<LeaguePlayerAchievement[]> {
  const placements = await prisma.leagueTournamentPlacement.findMany({ where: { playerId } });
  if (placements.length === 0) return [];

  const tournamentIds = [...new Set(placements.map((placement) => placement.tournamentId))];
  const tournaments = await Promise.all(tournamentIds.map((id) => prisma.leagueTournament.findUnique({ where: { id } })));
  const tournamentById = new Map(tournaments.flatMap((tournament) => (tournament ? [[tournament.id, tournament] as const] : [])));

  const achievements = placements.flatMap((placement): LeaguePlayerAchievement[] => {
    const tournament = tournamentById.get(placement.tournamentId);
    if (!tournament) return [];
    const leagueId = tournament.leagueId as LeagueId;
    const place = placement.place as 1 | 2 | 3;
    const definition = getLeaguePlacementRewardDefinition(leagueId, place);
    return [
      {
        leagueId,
        place,
        tournamentId: placement.tournamentId,
        weekKey: tournament.weekKey,
        achievementLabel: definition.achievementLabel,
        achievementImageUrl: definition.achievementImageUrl,
        achievedAt: placement.createdAt,
      },
    ];
  });

  return achievements.sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}
