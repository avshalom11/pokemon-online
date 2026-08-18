import { redirect } from "next/navigation";

import { BattleWindow } from "@/features/battle/components/BattleWindow";
import { LeagueMatchContent } from "@/features/leagues/components/LeagueMatchContent";
import { joinLeagueMatch, loadMatchContext } from "@/features/leagues/services/league-battle-session.service";
import { getLeagueBattleViewData } from "@/features/leagues/services/league-battle-view.service";
import { resolveExpiredLeagueMatch } from "@/features/leagues/services/league-match-resolution.service";
import { advanceCompletedLeagueRound, finalizeLeagueTournamentIfComplete } from "@/features/leagues/services/league-round-advancement.service";
import { grantCompletedLeagueTournamentRewards } from "@/features/leagues/services/league-reward.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

interface LeagueMatchPageProps {
  params: Promise<{ matchId: string }>;
}

// GYMS & LEAGUES PHASE 6/7 — the League PvP match screen (section 19/28).
// Visiting this route IS the "enter/join" action (section 7) — this page
// calls joinLeagueMatch itself on every render, which is a safe no-op for
// a side that has already joined, so re-entering after navigating away
// (section 21) always resumes the exact same persistent LeagueBattleSession
// rather than needing a separate "click to join" step.
//
// SELF-RESOLVE ON ACCESS (Phase 7, section 26/27) — resolveExpiredLeagueMatch
// runs BEFORE the join attempt on every visit: a match whose 20-minute room
// window has already passed gets resolved (no-show/timeout) right here,
// the instant anyone next looks at it, without any cron/scheduler. By the
// time joinLeagueMatch runs afterward, an actually-expired match already
// reads back as match-already-completed with its real persisted result.
export default async function LeagueMatchPage({ params }: LeagueMatchPageProps) {
  const { matchId } = await params;
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const profile = await getPlayerProfile(session.user.id);

  await resolveExpiredLeagueMatch(matchId);

  // TOURNAMENT PROGRESSION ON ACCESS (Phase 7 section 26, closed out by
  // Phase 8) — the same "self-resolve when accessed, never a cron/
  // scheduler" principle extended one step further: if resolving this
  // match just completed its whole round, advance to the next round (or,
  // once the Final itself is done, finalize placements and grant League
  // rewards) right here. A no-op on every visit that isn't the one that
  // actually finished a round — advanceCompletedLeagueRound/
  // finalizeLeagueTournamentIfComplete/grantCompletedLeagueTournamentRewards
  // are all idempotent by construction.
  const matchContext = await loadMatchContext(matchId);
  if (matchContext) {
    const advance = await advanceCompletedLeagueRound(matchContext.match.tournamentId, matchContext.match.roundNumber);
    if (advance.status === "tournament-complete") {
      const finalized = await finalizeLeagueTournamentIfComplete(matchContext.match.tournamentId);
      if (finalized.status === "completed") {
        await grantCompletedLeagueTournamentRewards(matchContext.match.tournamentId);
      }
    }
  }

  const joinResult = await joinLeagueMatch(matchId, profile.id);

  if (joinResult.status === "not-a-participant" || joinResult.status === "match-not-found" || joinResult.status === "no-usable-party") {
    redirect("/leagues");
  }

  // ROOM AVAILABILITY (section 2/28) — no session exists yet before the
  // room opens (nobody has ever joined), so this is handled directly here
  // rather than through getLeagueBattleViewData, which otherwise has
  // nothing real to assemble a view from yet.
  if (joinResult.status === "room-not-open-yet") {
    return (
      <BattleWindow>
        <div dir="rtl" className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-950 text-center">
          <p className="text-lg font-semibold text-slate-100">הקרב עדיין לא נפתח</p>
          <p className="text-sm text-slate-400">יש לחזור בשעת הקרב המתוכננת</p>
        </div>
      </BattleWindow>
    );
  }

  // "joined" | "room-expired" | "match-already-completed"
  // all render the same screen from here — getLeagueBattleViewData's own
  // roomState/status/winnerSide fields are what LeagueMatchContent uses to
  // decide which of section 28's states to show; no join/window/winner
  // logic ever lives in the client component itself.
  const result = await getLeagueBattleViewData(matchId, profile.id, profile.displayName);
  if (result.status !== "ready") {
    redirect("/leagues");
  }

  return <LeagueMatchContent matchId={matchId} initialData={result.data} />;
}
