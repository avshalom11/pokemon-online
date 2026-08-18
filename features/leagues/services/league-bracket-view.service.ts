import "server-only";

import { getPlayerProfilesByIds } from "@/lib/auth/player-profile";
import { prisma } from "@/lib/db/prisma";
import type { LeagueBattleSession, LeagueTournamentMatch, LeagueTournamentParticipant } from "@/lib/generated/prisma/client";
import {
  leagueComputerParticipantLabelHe,
  leagueMatchStatusLabelHe,
  leagueResolutionReasonLabelHe,
  leagueRoundLabelHe,
  type LeagueMatchDisplayStatus,
} from "../data/league-match-labels";
import { getLeagueMatchWindowState } from "../utils/league-match-window";

// GYMS & LEAGUES PHASE 9 (sections 15-20) — the ONE server-side assembler
// for a tournament's bracket/match-card/placement presentation. No such
// aggregation existed before this Phase — league-tournament.service.ts only
// ever exposed raw Prisma rows, one round at a time. This is read-only
// (never generates a round, never resolves a match — the match/[matchId]
// page itself already owns every self-resolve-on-access call) and never
// re-derives a game rule: match status here is a pure PRESENTATION label
// over the exact same persisted status/resolutionReason/window-state facts
// the real gameplay services already computed; winners/placements are read
// straight off LeagueTournamentMatch.winnerParticipantId and Phase 7's own
// LeagueTournamentPlacement rows, never recomputed.

export interface LeagueMatchCardView {
  readonly matchId: string;
  readonly roundNumber: number;
  readonly roundLabel: string;
  readonly participantAName: string;
  readonly participantBName: string;
  readonly participantAIsComputer: boolean;
  readonly participantBIsComputer: boolean;
  readonly participantAIsViewer: boolean;
  readonly participantBIsViewer: boolean;
  readonly scheduledAtLabel: string;
  readonly displayStatus: LeagueMatchDisplayStatus;
  readonly statusLabel: string;
  readonly winnerName: string | null;
  // Identity-based, never a name-string comparison (two participants can
  // legitimately share a display name) — null before the match has a
  // winner.
  readonly winnerIsParticipantA: boolean | null;
  readonly resolutionReasonLabel: string | null;
  // True only when the viewer is a real participant of this exact match and
  // it has not yet completed — the one condition under which showing
  // "כניסה לקרב" makes sense; the match page itself still re-validates
  // everything (join window, participation) independently.
  readonly canEnter: boolean;
}

export interface LeagueBracketRoundView {
  readonly roundNumber: number;
  readonly roundLabel: string;
  readonly matches: readonly LeagueMatchCardView[];
}

export interface LeagueBracketPlacementView {
  readonly place: 1 | 2 | 3;
  readonly playerName: string;
  readonly isViewer: boolean;
}

export interface LeagueTournamentBracketView {
  readonly tournamentId: string;
  readonly status: string;
  readonly rounds: readonly LeagueBracketRoundView[];
  readonly placements: readonly LeagueBracketPlacementView[];
}

function sideEntered(participant: LeagueTournamentParticipant | undefined, session: LeagueBattleSession | null, side: "A" | "B"): boolean {
  if (participant?.participantType === "computer") return true;
  if (!session) return false;
  return (side === "A" ? session.participantAJoinedAt : session.participantBJoinedAt) !== null;
}

function deriveDisplayStatus(
  match: LeagueTournamentMatch,
  participantA: LeagueTournamentParticipant | undefined,
  participantB: LeagueTournamentParticipant | undefined,
  session: LeagueBattleSession | null,
  now: Date
): LeagueMatchDisplayStatus {
  if (match.status === "completed") {
    if (match.resolutionReason === "opponent-no-show" || match.resolutionReason === "random-no-show") return "no-show";
    if (match.resolutionReason?.startsWith("timeout-")) return "timeout";
    return "completed";
  }

  const windowState = getLeagueMatchWindowState(match.scheduledAt, now);
  if (windowState === "not-open-yet") return "not-open-yet";

  const aEntered = sideEntered(participantA, session, "A");
  const bEntered = sideEntered(participantB, session, "B");
  return aEntered && bEntered ? "active" : "waiting";
}

const JERUSALEM_MATCH_TIME_FORMAT = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export async function getTournamentBracketView(tournamentId: string, viewerPlayerId: string, now: Date = new Date()): Promise<LeagueTournamentBracketView | null> {
  const tournament = await prisma.leagueTournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return null;

  const [matches, participants, placements] = await Promise.all([
    prisma.leagueTournamentMatch.findMany({ where: { tournamentId }, orderBy: [{ roundNumber: "asc" }, { slot: "asc" }] }),
    prisma.leagueTournamentParticipant.findMany({ where: { tournamentId } }),
    prisma.leagueTournamentPlacement.findMany({ where: { tournamentId }, orderBy: { place: "asc" } }),
  ]);

  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const realPlayerIds = [
    ...participants.flatMap((participant) => (participant.playerId ? [participant.playerId] : [])),
    ...placements.map((placement) => placement.playerId),
  ];
  const displayNames = await getPlayerProfilesByIds(realPlayerIds);

  const placementViews: LeagueBracketPlacementView[] = placements.map((placement) => ({
    place: placement.place as 1 | 2 | 3,
    playerName: displayNames.get(placement.playerId) ?? "שחקן",
    isViewer: placement.playerId === viewerPlayerId,
  }));

  if (matches.length === 0) {
    return { tournamentId, status: tournament.status, rounds: [], placements: placementViews };
  }

  const sessions = await Promise.all(matches.map((match) => prisma.leagueBattleSession.findUnique({ where: { tournamentMatchId: match.id } })));
  const sessionByMatchId = new Map(matches.map((match, index) => [match.id, sessions[index]]));

  const maxRoundNumber = Math.max(...matches.map((match) => match.roundNumber));

  function nameFor(participantId: string): string {
    const participant = participantById.get(participantId);
    if (!participant) return "שחקן";
    if (participant.participantType === "computer") return leagueComputerParticipantLabelHe();
    return displayNames.get(participant.playerId ?? "") ?? "שחקן";
  }

  const roundsByNumber = new Map<number, LeagueMatchCardView[]>();
  for (const match of matches) {
    const participantA = participantById.get(match.participantAId);
    const participantB = participantById.get(match.participantBId);
    const session = sessionByMatchId.get(match.id) ?? null;
    const displayStatus = deriveDisplayStatus(match, participantA, participantB, session, now);

    const card: LeagueMatchCardView = {
      matchId: match.id,
      roundNumber: match.roundNumber,
      roundLabel: leagueRoundLabelHe(match.roundNumber, maxRoundNumber),
      participantAName: nameFor(match.participantAId),
      participantBName: nameFor(match.participantBId),
      participantAIsComputer: participantA?.participantType === "computer",
      participantBIsComputer: participantB?.participantType === "computer",
      participantAIsViewer: participantA?.playerId === viewerPlayerId,
      participantBIsViewer: participantB?.playerId === viewerPlayerId,
      scheduledAtLabel: JERUSALEM_MATCH_TIME_FORMAT.format(match.scheduledAt),
      displayStatus,
      statusLabel: leagueMatchStatusLabelHe(displayStatus),
      winnerName: match.winnerParticipantId ? nameFor(match.winnerParticipantId) : null,
      winnerIsParticipantA: match.winnerParticipantId ? match.winnerParticipantId === match.participantAId : null,
      resolutionReasonLabel: leagueResolutionReasonLabelHe(match.resolutionReason),
      // Only while the match room is actually open (section 18's own
      // "כניסה לקרב" button) — never for a match that hasn't opened yet or
      // has already finished, even for the viewer's own match.
      canEnter: (displayStatus === "waiting" || displayStatus === "active") && (participantA?.playerId === viewerPlayerId || participantB?.playerId === viewerPlayerId),
    };

    const list = roundsByNumber.get(match.roundNumber) ?? [];
    list.push(card);
    roundsByNumber.set(match.roundNumber, list);
  }

  const rounds: LeagueBracketRoundView[] = [...roundsByNumber.entries()]
    .sort(([a], [b]) => a - b)
    .map(([roundNumber, roundMatches]) => ({
      roundNumber,
      roundLabel: leagueRoundLabelHe(roundNumber, maxRoundNumber),
      matches: roundMatches,
    }));

  return { tournamentId, status: tournament.status, rounds, placements: placementViews };
}
