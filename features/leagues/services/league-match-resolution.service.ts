import "server-only";

import { getPlayerLevel } from "@/features/player-progression/progression-service";
import { prisma } from "@/lib/db/prisma";
import type { LeagueBattleSession, LeagueTournamentMatch, LeagueTournamentParticipant } from "@/lib/generated/prisma/client";
import { parseLeagueBattleHp, parseLeagueBattlePokemon } from "./league-battle-session.service";
import { resolveTiebreak, type TiebreakCandidate } from "../utils/league-tiebreak";
import { getLeagueMatchWindowState } from "../utils/league-match-window";

// GYMS & LEAGUES PHASE 7 — resolves exactly ONE expired League match
// (sections 3-11). NORMAL BATTLE VICTORY HAS PRIORITY (section 4): this
// function's very first check is "is the match already completed" — a
// legitimately finished Phase 6 battle (or an earlier resolution call) is
// never overwritten. Only genuinely unresolved-but-expired matches ever
// reach the actual resolution logic below.

export type ResolveExpiredLeagueMatchResult =
  | { status: "already-completed" }
  | { status: "not-open-yet" }
  | { status: "still-open" }
  | { status: "resolved"; winnerParticipantId: string; reason: string };

// PLAYER LEVEL TIE-BREAK SOURCE (section 9) — Phase 6 deliberately did NOT
// snapshot Player Level anywhere on LeagueBattleSession/participant rows
// (only Pokémon snapshots + battle-local state), so this reads the
// AUTHORITATIVE PlayerProfile.level at resolution time via the existing
// getPlayerLevel primitive — never a second, independent curve. For a computer
// side (section 12), there is no PlayerProfile to read at all; its own
// generated team's level (uniform across every member — see
// league-computer-team.service.ts's own "flat, not offset" rule) stands in
// as its comparable "level" for this tie-break only.
export async function buildTiebreakCandidateFromSession(
  side: "A" | "B",
  match: LeagueTournamentMatch,
  participant: LeagueTournamentParticipant,
  session: LeagueBattleSession | null
): Promise<TiebreakCandidate> {
  const participantId = side === "A" ? match.participantAId : match.participantBId;

  if (!session) {
    return { participantId, livingPokemonCount: 0, playerLevel: 0, enteredAt: null };
  }

  const pokemon = parseLeagueBattlePokemon(side === "A" ? session.participantAPokemon : session.participantBPokemon);
  const battleHp = parseLeagueBattleHp(side === "A" ? session.participantABattleHp : session.participantBBattleHp);
  const livingPokemonCount = pokemon.filter((p) => (battleHp[p.slotId] ?? 0) > 0).length;
  const enteredAt = side === "A" ? session.participantAJoinedAt : session.participantBJoinedAt;

  const playerLevel =
    participant.participantType === "computer" ? (pokemon[0]?.level ?? 0) : await getPlayerLevel(participant.playerId as string);

  return { participantId, livingPokemonCount, playerLevel, enteredAt };
}

// COMPUTER FILLER — ROOM PRESENCE (section 12): a computer side is always
// considered "entered" the instant the match exists — it never has its own
// join timestamp (LeagueBattleSession only ever stores a real join moment
// for a real side; the computer's own side is populated synchronously by
// Phase 6's joinLeagueMatch the moment the real player joins).
function hasEntered(participant: LeagueTournamentParticipant, session: LeagueBattleSession | null, side: "A" | "B"): boolean {
  if (participant.participantType === "computer") return true;
  if (!session) return false;
  return (side === "A" ? session.participantAJoinedAt : session.participantBJoinedAt) !== null;
}

export async function resolveExpiredLeagueMatch(
  matchId: string,
  now: Date = new Date(),
  randomSource: () => number = Math.random
): Promise<ResolveExpiredLeagueMatchResult> {
  const match = await prisma.leagueTournamentMatch.findUnique({ where: { id: matchId } });
  if (!match) return { status: "already-completed" };
  if (match.status === "completed") return { status: "already-completed" };

  const windowState = getLeagueMatchWindowState(match.scheduledAt, now);
  if (windowState === "not-open-yet") return { status: "not-open-yet" };
  if (windowState === "open") return { status: "still-open" };

  const [participantA, participantB] = await Promise.all([
    prisma.leagueTournamentParticipant.findUnique({ where: { id: match.participantAId } }),
    prisma.leagueTournamentParticipant.findUnique({ where: { id: match.participantBId } }),
  ]);
  if (!participantA || !participantB) return { status: "already-completed" };

  const session = await prisma.leagueBattleSession.findUnique({ where: { tournamentMatchId: matchId } });

  const aEntered = hasEntered(participantA, session, "A");
  const bEntered = hasEntered(participantB, session, "B");

  let winnerParticipantId: string;
  let reason: string;

  if (!aEntered && !bEntered) {
    // BOTH PLAYERS NEVER ENTERED (section 5) — always a real-vs-real match
    // here (a computer side always counts as entered), randomly chosen,
    // injectable/testable random source.
    winnerParticipantId = randomSource() < 0.5 ? match.participantAId : match.participantBId;
    reason = "random-no-show";
  } else if (aEntered !== bEntered) {
    // ONLY ONE PLAYER ENTERED (section 6).
    winnerParticipantId = aEntered ? match.participantAId : match.participantBId;
    reason = "opponent-no-show";
  } else {
    // BOTH ENTERED — UNFINISHED BATTLE (section 7-11).
    const [candidateA, candidateB] = await Promise.all([
      buildTiebreakCandidateFromSession("A", match, participantA, session),
      buildTiebreakCandidateFromSession("B", match, participantB, session),
    ]);
    const result = resolveTiebreak(candidateA, candidateB);
    winnerParticipantId = result.winner.participantId;
    reason = result.reason;
  }

  // IDEMPOTENCY/CONCURRENCY (section 25) — the `status: { not: "completed" }`
  // guard is what prevents this from ever overwriting a match a racing
  // normal-attack call (or another racing resolution call) already
  // completed a moment earlier; a losing race here safely reports
  // "already-completed" rather than corrupting the real winner.
  const resolved = await prisma.$transaction(async (tx) => {
    const matchUpdate = await tx.leagueTournamentMatch.updateMany({
      where: { id: matchId, status: { not: "completed" } },
      data: { status: "completed", winnerParticipantId, resolutionReason: reason },
    });
    if (matchUpdate.count === 0) return false;

    if (session) {
      await tx.leagueBattleSession.updateMany({
        where: { id: session.id, status: { not: "completed" } },
        data: { status: "completed", winnerParticipantId, completedAt: now },
      });
    }
    return true;
  });

  if (!resolved) return { status: "already-completed" };
  return { status: "resolved", winnerParticipantId, reason };
}
