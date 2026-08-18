import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { LeagueTournament } from "@/lib/generated/prisma/client";
import { getLeagueRoundStartTime, getOccurrenceWindowForWeekKey } from "../utils/jerusalem-schedule";
import { getWeekKeyForLeagueInCycle } from "../utils/league-cycle";
import { generateRound1Pairings, type PairingSide } from "../utils/tournament-pairing";

// GYMS & LEAGUES PHASE 8 — Champions League qualification + tournament
// creation (sections 3-7). Champions League itself never has manual
// registration (Phase 5's own rule, unchanged) — its 4 participants are
// derived entirely from persisted Phase 7 LeagueTournamentPlacement rows
// for the SAME 4-week cycle (league-cycle.ts's own getWeekKeyForLeagueInCycle),
// never from client state, and never mixed across cycles.

function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

export interface ChampionsQualifier {
  readonly leagueId: "league-1" | "league-2" | "league-3";
  readonly place: 1 | 2;
  readonly participantId: string;
  readonly playerId: string;
}

export type ResolveChampionsQualifiersResult =
  | { status: "ready"; qualifiers: readonly [ChampionsQualifier, ChampionsQualifier, ChampionsQualifier, ChampionsQualifier] }
  | { status: "qualifiers-not-ready" }
  // DUPLICATE-QUALIFIER AUDIT (section 26) — see this file's own bottom
  // doc comment for the full analysis of why this IS reachable under the
  // current architecture (a player can legitimately register for and win
  // more than one regional League across the different weeks of the same
  // cycle) and why this deliberately surfaces rather than silently
  // substitutes a replacement qualifier.
  | { status: "duplicate-qualifier"; playerId: string };

async function completedTournamentFor(leagueId: "league-1" | "league-2" | "league-3", cycleKey: string): Promise<LeagueTournament | null> {
  const weekKey = getWeekKeyForLeagueInCycle(leagueId, cycleKey);
  const tournament = await prisma.leagueTournament.findUnique({ where: { leagueId_weekKey: { leagueId, weekKey } } });
  return tournament && tournament.status === "completed" ? tournament : null;
}

// Resolves the exact 4 Champions qualifiers (section 3) for one 4-week
// cycle: League I/II/III winners, plus League III's own runner-up. Never
// requires those players to have claimed their regional reward first
// (section 25) — reads placements alone.
export async function resolveChampionsQualifiers(cycleKey: string): Promise<ResolveChampionsQualifiersResult> {
  const [t1, t2, t3] = await Promise.all([
    completedTournamentFor("league-1", cycleKey),
    completedTournamentFor("league-2", cycleKey),
    completedTournamentFor("league-3", cycleKey),
  ]);
  if (!t1 || !t2 || !t3) return { status: "qualifiers-not-ready" };

  const [p1, p2, p3] = await Promise.all([
    prisma.leagueTournamentPlacement.findMany({ where: { tournamentId: t1.id } }),
    prisma.leagueTournamentPlacement.findMany({ where: { tournamentId: t2.id } }),
    prisma.leagueTournamentPlacement.findMany({ where: { tournamentId: t3.id } }),
  ]);

  const l1Winner = p1.find((p) => p.place === 1);
  const l2Winner = p2.find((p) => p.place === 1);
  const l3Winner = p3.find((p) => p.place === 1);
  const l3RunnerUp = p3.find((p) => p.place === 2);
  if (!l1Winner || !l2Winner || !l3Winner || !l3RunnerUp) return { status: "qualifiers-not-ready" };

  const qualifiers: [ChampionsQualifier, ChampionsQualifier, ChampionsQualifier, ChampionsQualifier] = [
    { leagueId: "league-1", place: 1, participantId: l1Winner.participantId, playerId: l1Winner.playerId },
    { leagueId: "league-2", place: 1, participantId: l2Winner.participantId, playerId: l2Winner.playerId },
    { leagueId: "league-3", place: 1, participantId: l3Winner.participantId, playerId: l3Winner.playerId },
    { leagueId: "league-3", place: 2, participantId: l3RunnerUp.participantId, playerId: l3RunnerUp.playerId },
  ];

  const seenPlayerIds = new Set<string>();
  for (const qualifier of qualifiers) {
    if (seenPlayerIds.has(qualifier.playerId)) {
      return { status: "duplicate-qualifier", playerId: qualifier.playerId };
    }
    seenPlayerIds.add(qualifier.playerId);
  }

  return { status: "ready", qualifiers };
}

export type CreateChampionsLeagueTournamentResult =
  | { status: "created"; tournamentId: string }
  | { status: "already-exists"; tournamentId: string }
  | { status: "qualifiers-not-ready" }
  | { status: "duplicate-qualifier"; playerId: string };

// CHAMPIONS LEAGUE CREATION (section 5) — exactly once per cycle (the
// existing @@unique([leagueId, weekKey]) constraint on LeagueTournament is
// the same create-then-catch-P2002 guard every other tournament-occurrence
// creation in this project already uses). Exactly 4 real participants, no
// computer filler (4 is already even) — CHAMPIONS BRACKET (section 6)
// reuses the exact same pure pairing generator every other round already
// does, unmodified.
export async function createChampionsLeagueTournamentForCycle(
  cycleKey: string,
  randomSource?: () => number
): Promise<CreateChampionsLeagueTournamentResult> {
  const qualifiers = await resolveChampionsQualifiers(cycleKey);
  if (qualifiers.status !== "ready") return qualifiers;

  const weekKey = getWeekKeyForLeagueInCycle("champions-league", cycleKey);
  const window = getOccurrenceWindowForWeekKey(weekKey);

  let tournament: LeagueTournament;
  try {
    tournament = await prisma.leagueTournament.create({
      data: {
        leagueId: "champions-league",
        weekKey,
        registrationClosesAt: window.registrationClosesAt,
        round1StartsAt: window.round1StartsAt,
        status: "generated",
      },
    });
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) throw error;
    const existing = await prisma.leagueTournament.findUniqueOrThrow({ where: { leagueId_weekKey: { leagueId: "champions-league", weekKey } } });
    return { status: "already-exists", tournamentId: existing.id };
  }

  const participants = await Promise.all(
    qualifiers.qualifiers.map((qualifier) =>
      prisma.leagueTournamentParticipant.create({ data: { tournamentId: tournament.id, playerId: qualifier.playerId, participantType: "player" } })
    )
  );

  const pairingResult = generateRound1Pairings(
    participants.map((participant) => participant.id),
    randomSource
  );

  // Unreachable in practice — exactly 4 real ids is always >= 2 and always
  // even, so generateRound1Pairings never needs a filler and never returns
  // not-enough-participants here. Guarded anyway rather than asserted.
  if (pairingResult.status !== "ok") return { status: "qualifiers-not-ready" };

  const round1StartsAt = getLeagueRoundStartTime(tournament.round1StartsAt, 1);
  const resolveSideId = (side: PairingSide): string => {
    if (side.kind === "computer") throw new Error("Champions League Round 1 must never need a computer filler (exactly 4 real participants)");
    return side.participantId;
  };

  await prisma.$transaction(async (tx) => {
    for (const pairing of pairingResult.pairings) {
      await tx.leagueTournamentMatch.create({
        data: {
          tournamentId: tournament.id,
          roundNumber: 1,
          slot: pairing.slot,
          scheduledAt: round1StartsAt,
          participantAId: resolveSideId(pairing.sideA),
          participantBId: resolveSideId(pairing.sideB),
          status: "scheduled",
          involvesComputer: false,
        },
      });
    }
    await tx.leagueTournament.update({ where: { id: tournament.id }, data: { status: "generated" } });
  });

  return { status: "created", tournamentId: tournament.id };
}

// DUPLICATE-QUALIFIER AUDIT (section 26) — is it actually possible for the
// same real player to qualify from more than one source?
//
// Within a SINGLE regional League tournament: no. LeagueTournamentParticipant
// has @@unique([tournamentId, playerId]), so a player can hold at most one
// participant row in that tournament, and LeagueTournamentPlacement is one
// row per (tournamentId, place) each pointing at a DIFFERENT participant —
// League III's own winner and runner-up can never be the same player.
//
// ACROSS regional Leagues within the SAME cycle: YES, this is possible.
// Registration for League I/II/III is gated by section 1/2's own 4-week
// rotation (a player may only REGISTER for whichever League is active
// THAT specific week), but nothing prevents a player who is eligible for
// (and registers for and wins) League I in week 1 from ALSO being eligible
// for, registering for, and winning League III in week 3 of the exact same
// cycle — eligibility for each regional League only requires that
// League's own 9 Badges + 3 Champions (features/leagues/services/
// league-eligibility.service.ts), and nothing about winning League I ever
// blocks separately qualifying for League III's own badges/champions or
// registering for League III three weeks later. A sufficiently accomplished
// player could therefore legitimately be, e.g., both League I's winner AND
// League III's runner-up in the same cycle.
//
// Per this Phase's own explicit instruction, this is surfaced as a
// distinct "duplicate-qualifier" status rather than silently promoting a
// 3rd-place finisher or any other replacement — Champions League creation
// simply does not proceed until a human decision resolves the conflict.
