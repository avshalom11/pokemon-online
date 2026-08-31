import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { LeaguesContent } from "@/features/leagues/components/LeaguesContent";
import { getPlayerLeagueAchievements } from "@/features/leagues/services/league-achievement.service";
import { getTournamentBracketView, type LeagueTournamentBracketView } from "@/features/leagues/services/league-bracket-view.service";
import { createChampionsLeagueTournamentForCycle } from "@/features/leagues/services/champions-league.service";
import { getPendingLeaguePlacementCelebrations } from "@/features/leagues/services/league-placement-celebration.service";
import { getLeaguesOverview } from "@/features/leagues/services/league-view.service";
import { ensureRound1GeneratedForActiveTournament, getCurrentTournamentForLeague } from "@/features/leagues/services/league-tournament.service";
import { getCurrentLeagueCycle } from "@/features/leagues/utils/league-cycle";
import type { LeagueId } from "@/features/leagues/types/league.types";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile, getPlayerProfilesByIds } from "@/lib/auth/player-profile";

// GYMS & LEAGUES PHASE 5/8/9 — the generic League registration + overview
// page (section 13/28): one route for all 4 Leagues, never 4 separate
// pages, and no separate bracket route either (section 2) — this same page
// now also assembles each League's current-tournament bracket (Phase 9's
// own new league-bracket-view.service.ts) and the viewer's own achievement
// history, all read-only. The real auth + onboarding guard lives in
// app/(game)/layout.tsx; the no-session check below exists purely so
// TypeScript can narrow session.user.id's type (getCurrentSession is
// cache()-wrapped, so this costs no extra DB round trip).
export default async function LeaguesPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const profile = await getPlayerProfile(session.user.id);
  const now = new Date();

  // ROUND-1 GENERATION ON ACCESS (bugfix — the one League lifecycle step
  // that was never wired to any production path: generateRound1ForTournament
  // existed and was tested since Phase 5, but nothing ever called it, so a
  // real tournament could sit at "registration-closed" forever). Same
  // "self-resolve when accessed, no cron" principle as every other
  // lifecycle step below — a safe no-op while registration is still open,
  // once Round 1 already exists, or for a League that isn't this week's
  // active one (getCurrentTournamentForLeague only ever resolves a
  // tournament for the League that was actually open for registration this
  // week — see league-tournament.service.ts's own doc comment).
  const cycle = getCurrentLeagueCycle(now);
  if (cycle.activeLeagueId !== "champions-league") {
    await ensureRound1GeneratedForActiveTournament(cycle.activeLeagueId, now);
  }

  // CHAMPIONS LEAGUE CREATION ON ACCESS (Phase 8, section 5/26/27) — the
  // same "self-resolve when accessed, no cron" principle Phase 7 already
  // established: if this cycle's qualifiers are ready and no Champions
  // tournament exists yet, create it right here. A safe no-op on every
  // other visit (already-exists/qualifiers-not-ready/duplicate-qualifier
  // all just fall through to a normal read-only overview render).
  await createChampionsLeagueTournamentForCycle(cycle.cycleKey);

  const overview = await getLeaguesOverview(profile.id, now);
  const achievements = await getPlayerLeagueAchievements(profile.id);

  // LEAGUE — FINAL PLACEMENT CELEBRATION MODAL — resolved once here,
  // read-only (never writes/creates anything — see that service's own doc
  // comment), same "server computes the full view, client only renders and
  // acknowledges" split every other piece of this page's data already
  // follows. Empty for a participation-only player, structurally — no
  // special-casing needed.
  const pendingCelebrations = await getPendingLeaguePlacementCelebrations(profile.id);

  // BRACKET DATA (Phase 9, section 15) — for every League that currently has
  // a tournament instance, resolve its bracket. Deliberately read-only: this
  // never calls advanceCompletedLeagueRound itself — that remains the match
  // page's own job. Round 1 generation itself is handled above. A regional
  // League whose tournament exists but has no matches yet (registration
  // just closed, generation above hasn't run for it because it isn't this
  // week's active League) simply renders an empty bracket.
  const regionalLeagueIds: readonly LeagueId[] = ["league-1", "league-2", "league-3"];
  const regionalTournaments = await Promise.all(regionalLeagueIds.map((leagueId) => getCurrentTournamentForLeague(leagueId as "league-1" | "league-2" | "league-3")));

  const bracketEntries = await Promise.all(
    regionalLeagueIds.map(async (leagueId, index) => {
      const tournament = regionalTournaments[index];
      if (!tournament) return [leagueId, null] as const;
      return [leagueId, await getTournamentBracketView(tournament.id, profile.id)] as const;
    })
  );

  const championsTournamentId = overview.championsLeague.tournamentId;
  const championsBracket = championsTournamentId ? await getTournamentBracketView(championsTournamentId, profile.id) : null;

  const brackets: Record<LeagueId, LeagueTournamentBracketView | null> = {
    "league-1": null,
    "league-2": null,
    "league-3": null,
    "champions-league": championsBracket,
  };
  for (const [leagueId, bracket] of bracketEntries) {
    brackets[leagueId] = bracket;
  }

  // CURRENT-CHAMPION DISPLAY NAMES (Phase 9, section 24) — the view service
  // only ever carries playerId; every id shown to the player is resolved to
  // its real PlayerProfile.displayName here, exactly once, in a single
  // batched query — no raw id ever reaches LeaguesContent.
  const championPlayerIds = [
    ...overview.regionalLeagues.flatMap((league) => (league.currentChampionPlayerId ? [league.currentChampionPlayerId] : [])),
    ...(overview.championsLeague.currentChampionPlayerId ? [overview.championsLeague.currentChampionPlayerId] : []),
  ];
  const championDisplayNames = await getPlayerProfilesByIds(championPlayerIds);

  return (
    <GameScreen>
      <LeaguesContent
        overview={overview}
        achievements={achievements}
        brackets={brackets}
        championDisplayNames={Object.fromEntries(championDisplayNames)}
        pendingCelebrations={pendingCelebrations}
      />
    </GameScreen>
  );
}
