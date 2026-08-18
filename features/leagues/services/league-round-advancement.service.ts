import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { LeagueTournamentMatch, LeagueTournamentParticipant } from "@/lib/generated/prisma/client";
import { buildTiebreakCandidateFromSession, resolveExpiredLeagueMatch } from "./league-match-resolution.service";
import { rankTiebreakCandidates } from "../utils/league-tiebreak";
import { getLeagueRoundStartTime } from "../utils/jerusalem-schedule";
import { generateRound1Pairings, type PairingSide } from "../utils/tournament-pairing";

// GYMS & LEAGUES PHASE 7 — round completion detection, next-round
// generation, and tournament/placement finalization (sections 13-23).
//
// COMPUTER ADVANCEMENT SIMPLIFICATION (documented per section 13's own
// "document the exact rule" request): rather than tracking "did the
// computer win last round" as a separate branch, this service always
// collects ONLY the REAL PLAYER winners of the just-completed round and
// hands that list — and NOTHING else — to the exact same pure pairing
// generator Phase 5 already built (generateRound1Pairings, reused
// unmodified despite the name: it is fully round-agnostic). That
// generator already adds exactly one `{kind:"computer"}` filler whenever
// its input list is odd, and adds none when it's even. Working through
// this project's own worked examples (section 14) confirms this is
// exactly equivalent to the literal "check next round's real-player parity
// without the computer" rule: 4 real winners (even) -> no filler needed
// either way; 3 real winners (odd) -> a filler is needed either way. The
// only remaining question is WHICH computer participant row to reuse for
// that filler (section 16) — never whether one is needed, which is pure
// arithmetic on the real-winner list Phase 5's own generator already does.
//
// ONE DELIBERATE EXCEPTION — a computer can never become a co-finalist. If
// the just-completed round leaves exactly ONE real winner, the tournament
// is finalized immediately with that player as champion, even if the
// round's own computer participant also won its match (which would
// otherwise, by the parity rule alone, want to "advance" the computer into
// a 1-real-vs-computer final). Section 22 requires a computer can never
// occupy a placement; letting it reach the final round makes that
// ambiguous (could a computer literally win the League?) in a way the
// approved design never specifies. Stopping generation the moment exactly
// one real player remains removes the ambiguity entirely and is never
// contradicted by any of the section 14 worked examples (all of which
// leave 3+ real winners, never exactly 1).

function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

// ROUND COMPLETION (section 17) — resolves any expired-but-unfinished
// matches in `roundNumber` first (so a stale match self-resolves the
// moment this is invoked, per section 26), then reports whether every
// match in that round now has a persisted winner.
export async function resolveExpiredLeagueRound(
  tournamentId: string,
  roundNumber: number,
  now: Date = new Date(),
  randomSource: () => number = Math.random
): Promise<void> {
  const matches = await prisma.leagueTournamentMatch.findMany({ where: { tournamentId, roundNumber } });
  for (const match of matches) {
    if (match.status !== "completed") {
      await resolveExpiredLeagueMatch(match.id, now, randomSource);
    }
  }
}

async function isRoundComplete(tournamentId: string, roundNumber: number): Promise<{ complete: boolean; matches: LeagueTournamentMatch[] }> {
  const matches = await prisma.leagueTournamentMatch.findMany({ where: { tournamentId, roundNumber } });
  if (matches.length === 0) return { complete: false, matches };
  return { complete: matches.every((match) => match.status === "completed"), matches };
}

async function realWinnersOf(matches: readonly LeagueTournamentMatch[], byId: Map<string, LeagueTournamentParticipant>): Promise<string[]> {
  return matches
    .map((match) => match.winnerParticipantId)
    .filter((id): id is string => id !== null)
    .filter((id) => byId.get(id)?.participantType === "player");
}

export type AdvanceLeagueRoundResult =
  | { status: "round-not-complete" }
  | { status: "already-generated"; nextRoundNumber: number }
  | { status: "tournament-complete" }
  | { status: "generated"; nextRoundNumber: number; matchCount: number };

// NEXT-ROUND GENERATION (section 18/19) — idempotent: a cheap existence
// check short-circuits the common case, and the real correctness
// guarantee is the SAME @@unique([tournamentId, roundNumber, slot])
// constraint + create-then-catch-P2002 idiom every other exactly-once
// primitive in this project already uses — two concurrent calls can never
// both succeed in creating the next round.
export async function advanceCompletedLeagueRound(
  tournamentId: string,
  roundNumber: number,
  now: Date = new Date(),
  randomSource: () => number = Math.random
): Promise<AdvanceLeagueRoundResult> {
  await resolveExpiredLeagueRound(tournamentId, roundNumber, now, randomSource);

  const { complete, matches } = await isRoundComplete(tournamentId, roundNumber);
  if (!complete) return { status: "round-not-complete" };

  const nextRoundNumber = roundNumber + 1;
  const existingNext = await prisma.leagueTournamentMatch.findFirst({ where: { tournamentId, roundNumber: nextRoundNumber } });
  if (existingNext) return { status: "already-generated", nextRoundNumber };

  const allParticipants = await prisma.leagueTournamentParticipant.findMany({ where: { tournamentId } });
  const byId = new Map(allParticipants.map((p) => [p.id, p]));
  const realWinnerIds = await realWinnersOf(matches, byId);

  // Exactly one (or zero, defensively) real winner remains — no further
  // round to generate; finalizeLeagueTournamentIfComplete owns placement.
  if (realWinnerIds.length <= 1) return { status: "tournament-complete" };

  const tournament = await prisma.leagueTournament.findUniqueOrThrow({ where: { id: tournamentId } });
  const pairingResult = generateRound1Pairings(realWinnerIds, randomSource);
  if (pairingResult.status !== "ok") return { status: "tournament-complete" };

  const scheduledAt = getLeagueRoundStartTime(tournament.round1StartsAt, nextRoundNumber);
  const existingComputer = allParticipants.find((p) => p.participantType === "computer") ?? null;

  try {
    await prisma.$transaction(async (tx) => {
      // COMPUTER PARTICIPANT PERSISTENCE (section 16) — reuse the
      // tournament's own existing computer participant row when one
      // already exists, rather than creating a new one every round a
      // filler happens to be needed again.
      let computerParticipantId: string | null = existingComputer?.id ?? null;
      const needsComputer = pairingResult.pairings.some((pairing) => pairing.sideA.kind === "computer" || pairing.sideB.kind === "computer");

      if (needsComputer && !computerParticipantId) {
        const created = await tx.leagueTournamentParticipant.create({ data: { tournamentId, playerId: null, participantType: "computer" } });
        computerParticipantId = created.id;
      }

      const resolveSideId = (side: PairingSide): string => (side.kind === "computer" ? computerParticipantId! : side.participantId);

      for (const pairing of pairingResult.pairings) {
        await tx.leagueTournamentMatch.create({
          data: {
            tournamentId,
            roundNumber: nextRoundNumber,
            slot: pairing.slot,
            scheduledAt,
            participantAId: resolveSideId(pairing.sideA),
            participantBId: resolveSideId(pairing.sideB),
            status: "scheduled",
            involvesComputer: pairing.sideA.kind === "computer" || pairing.sideB.kind === "computer",
          },
        });
      }
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) return { status: "already-generated", nextRoundNumber };
    throw error;
  }

  return { status: "generated", nextRoundNumber, matchCount: pairingResult.pairings.length };
}

interface EliminatedRealParticipant {
  readonly participant: LeagueTournamentParticipant;
  readonly match: LeagueTournamentMatch;
}

async function findEliminatedRealParticipants(
  tournamentId: string,
  roundNumber: number,
  byId: Map<string, LeagueTournamentParticipant>
): Promise<EliminatedRealParticipant[]> {
  const matches = await prisma.leagueTournamentMatch.findMany({ where: { tournamentId, roundNumber } });
  const eliminated: EliminatedRealParticipant[] = [];

  for (const match of matches) {
    if (!match.winnerParticipantId) continue;
    const loserId = match.participantAId === match.winnerParticipantId ? match.participantBId : match.participantAId;
    const loser = byId.get(loserId);
    // A Computer Filler can never receive placement (section 21) — only a
    // real player eliminated in this round is ever a placement candidate.
    if (loser && loser.participantType === "player") {
      eliminated.push({ participant: loser, match });
    }
  }

  return eliminated;
}

// Ranks a round's eliminated real players best-to-worst using the exact
// same tie-break priority chain match timeout resolution uses, reading
// each one's OWN final battle-local state (living Pokémon count, Player
// Level, entry time) from that match's own persisted, never-mutated-after-
// completion LeagueBattleSession — no separate snapshot needed.
async function rankEliminatedParticipants(eliminated: readonly EliminatedRealParticipant[]): Promise<LeagueTournamentParticipant[]> {
  const withCandidates = await Promise.all(
    eliminated.map(async ({ participant, match }) => {
      const session = await prisma.leagueBattleSession.findUnique({ where: { tournamentMatchId: match.id } });
      const side = match.participantAId === participant.id ? "A" : "B";
      const candidate = await buildTiebreakCandidateFromSession(side, match, participant, session);
      return { participant, candidate };
    })
  );

  const ranked = rankTiebreakCandidates(withCandidates.map((entry) => entry.candidate));
  return ranked.map((candidate) => withCandidates.find((entry) => entry.candidate.participantId === candidate.participantId)!.participant);
}

export interface LeagueTournamentPlacementRecord {
  readonly place: 1 | 2 | 3;
  readonly participantId: string;
  readonly playerId: string;
}

export type FinalizeLeagueTournamentResult =
  | { status: "not-final-yet" }
  | { status: "already-completed" }
  | { status: "completed"; placements: readonly LeagueTournamentPlacementRecord[] };

// TOURNAMENT COMPLETION (section 20-23) — called once the final round is
// fully complete (advanceCompletedLeagueRound already returns
// "tournament-complete" at that point). 1st = the sole remaining real
// winner. 2nd = the best-ranked real player eliminated in that SAME final
// round (the literal Final's own loser, in the common 2-player-final
// case — see this file's own top-of-file doc comment for the generalized
// case). 3rd = the best-ranked real player eliminated in the round BEFORE
// that (the semifinal), when one exists — a 2-real-player tournament
// legitimately produces no 3rd place at all (section 23).
export async function finalizeLeagueTournamentIfComplete(tournamentId: string): Promise<FinalizeLeagueTournamentResult> {
  const tournament = await prisma.leagueTournament.findUniqueOrThrow({ where: { id: tournamentId } });
  if (tournament.status === "completed") return { status: "already-completed" };

  const allMatches = await prisma.leagueTournamentMatch.findMany({ where: { tournamentId } });
  if (allMatches.length === 0) return { status: "not-final-yet" };

  const maxRoundNumber = Math.max(...allMatches.map((match) => match.roundNumber));
  const finalRoundMatches = allMatches.filter((match) => match.roundNumber === maxRoundNumber);
  if (finalRoundMatches.some((match) => match.status !== "completed")) return { status: "not-final-yet" };

  const allParticipants = await prisma.leagueTournamentParticipant.findMany({ where: { tournamentId } });
  const byId = new Map(allParticipants.map((p) => [p.id, p]));
  const realWinnersOfFinalRound = await realWinnersOf(finalRoundMatches, byId);

  if (realWinnersOfFinalRound.length !== 1) return { status: "not-final-yet" };

  const championId = realWinnersOfFinalRound[0];
  const championParticipant = byId.get(championId);
  if (!championParticipant?.playerId) return { status: "not-final-yet" };

  const finalRoundEliminated = await findEliminatedRealParticipants(tournamentId, maxRoundNumber, byId);
  const rankedFinalLosers = await rankEliminatedParticipants(finalRoundEliminated);
  const secondPlaceParticipant = rankedFinalLosers[0] ?? null;

  let thirdPlaceParticipant: LeagueTournamentParticipant | null = null;
  if (maxRoundNumber > 1) {
    const semifinalEliminated = await findEliminatedRealParticipants(tournamentId, maxRoundNumber - 1, byId);
    const rankedSemifinalLosers = await rankEliminatedParticipants(semifinalEliminated);
    thirdPlaceParticipant = rankedSemifinalLosers[0] ?? null;
  }

  const placements: LeagueTournamentPlacementRecord[] = [{ place: 1, participantId: championId, playerId: championParticipant.playerId }];
  if (secondPlaceParticipant?.playerId) {
    placements.push({ place: 2, participantId: secondPlaceParticipant.id, playerId: secondPlaceParticipant.playerId });
  }
  if (thirdPlaceParticipant?.playerId) {
    placements.push({ place: 3, participantId: thirdPlaceParticipant.id, playerId: thirdPlaceParticipant.playerId });
  }

  // IDEMPOTENCY (section 25) — the tournament-status guard is the atomic
  // claim: only the caller whose updateMany actually flips
  // registration-open/generated/etc -> "completed" ever writes placements;
  // a losing race (or a retry after success) safely no-ops.
  const outcome = await prisma.$transaction(async (tx) => {
    const claimed = await tx.leagueTournament.updateMany({ where: { id: tournamentId, status: { not: "completed" } }, data: { status: "completed" } });
    if (claimed.count === 0) return "already-completed" as const;

    for (const placement of placements) {
      await tx.leagueTournamentPlacement.create({ data: { tournamentId, ...placement } });
    }
    return "completed" as const;
  });

  if (outcome === "already-completed") return { status: "already-completed" };
  return { status: "completed", placements };
}
