import "server-only";

import { CHAMPIONS_LEAGUE, REGIONAL_LEAGUES } from "../data/league-registry";
import type { LeagueId, RegionalLeagueId } from "../types/league.types";
import { getCurrentLeagueChampion } from "./league-achievement.service";
import { getLeagueEligibility } from "./league-eligibility.service";
import { getCurrentTournamentForLeague, isPlayerRegistered } from "./league-tournament.service";
import { resolveChampionsQualifiers } from "./champions-league.service";
import { getCurrentLeagueTournamentOccurrenceWindow, isLeagueRegistrationOpen } from "../utils/jerusalem-schedule";
import { getCurrentLeagueCycle, getCycleWeekIndex, getWeekKeyForLeagueInCycle, isLeagueActiveThisWeek } from "../utils/league-cycle";
import { prisma } from "@/lib/db/prisma";

// GYMS & LEAGUES PHASE 5/8 — the server-side assembler for the /leagues
// page (section 13/28). Composes eligibility, the current registration
// window, the 4-week active-league rotation (Phase 8), Champions
// qualification/creation state, and current-champion data — read-only,
// never creates a tournament row itself (view-only, same "viewing never
// conjures a tournament into existence" rule getCurrentTournamentForLeague
// already documents). No bracket/trophy-gallery UI is assembled here —
// only the backend state Phase 9's own polished UI will need (section 28's
// own explicit scope).

export interface RegionalLeagueView {
  readonly leagueId: RegionalLeagueId;
  readonly displayName: string;
  readonly eligible: boolean;
  readonly badgeCount: number;
  readonly requiredBadgeCount: number;
  readonly regionalChampionCount: number;
  readonly requiredRegionalChampionCount: number;
  // GYMS & LEAGUES PHASE 8 — true only during this League's own week in
  // the 4-week rotation; registrationOpen is now ALWAYS false when this is
  // false, regardless of the plain Thursday-18:30 window.
  readonly activeThisWeek: boolean;
  readonly registrationOpen: boolean;
  readonly registrationClosesAt: Date;
  readonly registered: boolean;
  // This cycle's own tournament, if one exists yet.
  readonly completed: boolean;
  readonly currentChampionPlayerId: string | null;
}

export interface ChampionsLeagueView {
  readonly leagueId: "champions-league";
  readonly displayName: string;
  readonly activeThisWeek: boolean;
  readonly qualifiersReady: boolean;
  // GYMS & LEAGUES PHASE 9 (section 14) — true only while
  // resolveChampionsQualifiers itself reports "duplicate-qualifier"
  // (champions-league.service.ts's own documented, deliberately-surfaced
  // state — never silently resolved). Carries NO player id/name: the
  // required UI message is a neutral, generic notice, not a call-out of a
  // specific player.
  readonly hasDuplicateQualifier: boolean;
  readonly tournamentCreated: boolean;
  readonly tournamentId: string | null;
  readonly currentChampionPlayerId: string | null;
}

// GYMS & LEAGUES PHASE 9 (section 12) — the 4-week rotation's own current
// position, read straight off Phase 8's existing league-cycle.ts helpers
// (getCurrentLeagueCycle/getCycleWeekIndex) — never recomputed in React.
export interface LeagueCycleView {
  readonly activeLeagueId: LeagueId;
  // 0-based: 0=League I's week, 1=League II's week, 2=League III's week,
  // 3=Champions League's week.
  readonly weekIndexInCycle: number;
}

export interface LeaguesOverviewView {
  readonly regionalLeagues: readonly RegionalLeagueView[];
  readonly championsLeague: ChampionsLeagueView;
  readonly cycle: LeagueCycleView;
}

export async function getLeaguesOverview(playerId: string, now: Date = new Date()): Promise<LeaguesOverviewView> {
  const window = getCurrentLeagueTournamentOccurrenceWindow(now);
  const withinRegistrationWindow = isLeagueRegistrationOpen(window, now);
  const cycle = getCurrentLeagueCycle(now);

  const regionalLeagues = await Promise.all(
    REGIONAL_LEAGUES.map(async (league): Promise<RegionalLeagueView> => {
      const activeThisWeek = isLeagueActiveThisWeek(league.id, cycle.weekKey);
      const [eligibility, tournament, currentChampion] = await Promise.all([
        getLeagueEligibility(playerId, league),
        getCurrentTournamentForLeague(league.id, now),
        getCurrentLeagueChampion(league.id),
      ]);
      const registered = tournament ? await isPlayerRegistered(tournament.id, playerId) : false;

      return {
        leagueId: league.id,
        displayName: league.displayName,
        eligible: eligibility.eligible,
        badgeCount: eligibility.badgeCount,
        requiredBadgeCount: league.requiredBadgeCount,
        regionalChampionCount: eligibility.regionalChampionCount,
        requiredRegionalChampionCount: league.requiredRegionalChampionCount,
        activeThisWeek,
        // REGIONAL LEAGUE ACTIVE-WEEK REGISTRATION (Phase 8, section 2) —
        // registration is only ever open when BOTH the plain Thursday-18:30
        // window applies AND this is this League's own week.
        registrationOpen: activeThisWeek && withinRegistrationWindow,
        registrationClosesAt: window.registrationClosesAt,
        registered,
        completed: tournament?.status === "completed",
        currentChampionPlayerId: currentChampion?.playerId ?? null,
      };
    })
  );

  const isChampionsWeek = isLeagueActiveThisWeek(CHAMPIONS_LEAGUE.id, cycle.weekKey);
  const [qualifiers, championsCurrentChampion] = await Promise.all([
    resolveChampionsQualifiers(cycle.cycleKey),
    getCurrentLeagueChampion(CHAMPIONS_LEAGUE.id),
  ]);
  const championsWeekKey = getWeekKeyForLeagueInCycle(CHAMPIONS_LEAGUE.id, cycle.cycleKey);
  const championsTournament = await prisma.leagueTournament.findUnique({
    where: { leagueId_weekKey: { leagueId: CHAMPIONS_LEAGUE.id, weekKey: championsWeekKey } },
  });

  return {
    regionalLeagues,
    championsLeague: {
      leagueId: CHAMPIONS_LEAGUE.id,
      displayName: CHAMPIONS_LEAGUE.displayName,
      activeThisWeek: isChampionsWeek,
      qualifiersReady: qualifiers.status === "ready",
      hasDuplicateQualifier: qualifiers.status === "duplicate-qualifier",
      tournamentCreated: championsTournament !== null,
      tournamentId: championsTournament?.id ?? null,
      currentChampionPlayerId: championsCurrentChampion?.playerId ?? null,
    },
    cycle: {
      activeLeagueId: cycle.activeLeagueId as LeagueId,
      weekIndexInCycle: getCycleWeekIndex(cycle.weekKey),
    },
  };
}
