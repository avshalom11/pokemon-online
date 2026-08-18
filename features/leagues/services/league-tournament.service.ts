import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { LeagueTournament, LeagueTournamentMatch, LeagueTournamentParticipant } from "@/lib/generated/prisma/client";
import { CHAMPIONS_LEAGUE, REGIONAL_LEAGUES } from "../data/league-registry";
import type { LeagueId, RegionalLeagueId } from "../types/league.types";
import { getLeagueEligibility } from "./league-eligibility.service";
import {
  getCurrentLeagueTournamentOccurrenceWindow,
  getLeagueRoundStartTime,
  getLeagueTournamentWeekKey,
  isLeagueRegistrationOpen,
} from "../utils/jerusalem-schedule";
import { generateRound1Pairings, type PairingSide } from "../utils/tournament-pairing";
import { isLeagueActiveThisWeek } from "../utils/league-cycle";

// GYMS & LEAGUES PHASE 5 — the DB-backed registration/tournament-generation
// service. Every rule from this Phase's spec lands here: eligibility +
// registration-window validation before creating a participant row,
// exactly-once tournament-occurrence creation (unique [leagueId, weekKey]),
// idempotent registration (unique [tournamentId, playerId]), and Round-1
// generation via the pure pairing generator (tournament-pairing.ts).
// Deliberately does NOT implement PvP execution, round advancement past
// Round 1, or Champions League tournament creation — see this Phase's own
// "do not implement" list.

function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

// Finds-or-creates the LeagueTournament row for the current/upcoming
// weekly occurrence (section 5) — the unique (leagueId, weekKey) constraint
// is what makes "the same weekly tournament must not be created twice" a
// plain DB guarantee rather than app-level read-then-write logic; a
// concurrent/retried call safely resolves to the exact same row via the
// same create-then-catch-P2002 idiom gym-progression.service.ts already
// established.
async function getOrCreateCurrentTournament(leagueId: RegionalLeagueId, now: Date): Promise<LeagueTournament> {
  const window = getCurrentLeagueTournamentOccurrenceWindow(now);
  const weekKey = getLeagueTournamentWeekKey(window.registrationClosesAt);

  try {
    return await prisma.leagueTournament.create({
      data: {
        leagueId,
        weekKey,
        registrationClosesAt: window.registrationClosesAt,
        round1StartsAt: window.round1StartsAt,
        status: "registration-open",
      },
    });
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) throw error;
    return prisma.leagueTournament.findUniqueOrThrow({ where: { leagueId_weekKey: { leagueId, weekKey } } });
  }
}

// A read-only accessor for the UI — never creates a row (unlike
// getOrCreateCurrentTournament, which registerForLeague uses), so simply
// viewing the League page never conjures a tournament instance into
// existence before anyone has actually tried to register.
export async function getCurrentTournamentForLeague(leagueId: RegionalLeagueId, now: Date = new Date()): Promise<LeagueTournament | null> {
  const window = getCurrentLeagueTournamentOccurrenceWindow(now);
  const weekKey = getLeagueTournamentWeekKey(window.registrationClosesAt);
  return prisma.leagueTournament.findUnique({ where: { leagueId_weekKey: { leagueId, weekKey } } });
}

export type RegisterForLeagueResult =
  | { status: "registered"; tournamentId: string }
  | { status: "already-registered"; tournamentId: string }
  | { status: "ineligible"; badgeCount: number; regionalChampionCount: number }
  | { status: "registration-closed" }
  | { status: "champions-league-not-registerable" }
  // GYMS & LEAGUES PHASE 8 — the 4-week rotation gate (section 1/2): this
  // regional League exists and the player is eligible, but it simply isn't
  // THIS week's active League (e.g. trying to register for League II
  // during League I's week). Distinct from "registration-closed" (which
  // means the CORRECT week's own Thursday 18:30 has already passed) so the
  // UI/tests can tell the two apart.
  | { status: "league-not-active-this-week" }
  | { status: "invalid-league" };

// REGISTRATION RULES (section 4, extended by Phase 8 section 1/2) —
// eligible + this League's own cycle week + open -> register; ineligible ->
// reject; wrong cycle week -> reject; closed -> reject; already registered
// -> idempotent; Champions League -> always rejected. Every check is
// re-derived live (never trusts a client-supplied "I'm eligible"/"it's
// still open"/"it's my League's week" claim).
export async function registerForLeague(playerId: string, leagueId: LeagueId, now: Date = new Date()): Promise<RegisterForLeagueResult> {
  if (leagueId === CHAMPIONS_LEAGUE.id) {
    return { status: "champions-league-not-registerable" };
  }

  const league = REGIONAL_LEAGUES.find((candidate) => candidate.id === leagueId);
  if (!league) {
    return { status: "invalid-league" };
  }

  const eligibility = await getLeagueEligibility(playerId, league);
  if (!eligibility.eligible) {
    return { status: "ineligible", badgeCount: eligibility.badgeCount, regionalChampionCount: eligibility.regionalChampionCount };
  }

  const window = getCurrentLeagueTournamentOccurrenceWindow(now);
  if (!isLeagueRegistrationOpen(window, now)) {
    return { status: "registration-closed" };
  }

  const currentWeekKey = getLeagueTournamentWeekKey(window.registrationClosesAt);
  if (!isLeagueActiveThisWeek(league.id, currentWeekKey)) {
    return { status: "league-not-active-this-week" };
  }

  const tournament = await getOrCreateCurrentTournament(league.id, now);

  try {
    await prisma.leagueTournamentParticipant.create({
      data: { tournamentId: tournament.id, playerId, participantType: "player" },
    });
    return { status: "registered", tournamentId: tournament.id };
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) throw error;
    return { status: "already-registered", tournamentId: tournament.id };
  }
}

export async function isPlayerRegistered(tournamentId: string, playerId: string): Promise<boolean> {
  const row = await prisma.leagueTournamentParticipant.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId } },
    select: { id: true },
  });
  return row !== null;
}

export type GenerateRound1Result =
  | { status: "generated"; matchCount: number }
  | { status: "not-enough-participants" }
  | { status: "already-generated" };

// ROUND-1 GENERATION (section 8) — pulls every registered real player for
// `tournamentId`, hands their participant ids to the pure pairing
// generator, then persists exactly what it returns: at most one computer
// participant row, and one LeagueTournamentMatch row per pairing,
// scheduled via getLeagueRoundStartTime(round1StartsAt, 1) (== round1StartsAt
// itself). Idempotent against being called twice — a tournament already
// past "registration-open"/"registration-closed" returns
// "already-generated" rather than creating a second bracket.
export async function generateRound1ForTournament(tournamentId: string, randomSource?: () => number): Promise<GenerateRound1Result> {
  const tournament = await prisma.leagueTournament.findUniqueOrThrow({ where: { id: tournamentId } });

  if (tournament.status !== "registration-open" && tournament.status !== "registration-closed") {
    return { status: "already-generated" };
  }

  const realParticipants = await prisma.leagueTournamentParticipant.findMany({
    where: { tournamentId, participantType: "player" },
    orderBy: { registeredAt: "asc" },
  });

  const pairingResult = generateRound1Pairings(
    realParticipants.map((participant) => participant.id),
    randomSource
  );

  if (pairingResult.status === "not-enough-participants") {
    await prisma.leagueTournament.updateMany({ where: { id: tournamentId }, data: { status: "registration-closed" } });
    return { status: "not-enough-participants" };
  }

  const roundStartsAt = getLeagueRoundStartTime(tournament.round1StartsAt, 1);

  await prisma.$transaction(async (tx) => {
    let computerParticipantId: string | null = null;
    const needsComputerFiller = pairingResult.pairings.some((pairing) => pairing.sideA.kind === "computer" || pairing.sideB.kind === "computer");

    if (needsComputerFiller) {
      const computer = await tx.leagueTournamentParticipant.create({
        data: { tournamentId, playerId: null, participantType: "computer" },
      });
      computerParticipantId = computer.id;
    }

    const resolveSideId = (side: PairingSide): string => (side.kind === "computer" ? computerParticipantId! : side.participantId);

    for (const pairing of pairingResult.pairings) {
      await tx.leagueTournamentMatch.create({
        data: {
          tournamentId,
          roundNumber: 1,
          slot: pairing.slot,
          scheduledAt: roundStartsAt,
          participantAId: resolveSideId(pairing.sideA),
          participantBId: resolveSideId(pairing.sideB),
          status: "scheduled",
          involvesComputer: pairing.sideA.kind === "computer" || pairing.sideB.kind === "computer",
        },
      });
    }

    await tx.leagueTournament.update({ where: { id: tournamentId }, data: { status: "generated" } });
  });

  return { status: "generated", matchCount: pairingResult.pairings.length };
}

// ROUND-1 GENERATION — PRODUCTION LIFECYCLE WIRING (bugfix). Phase 5 built
// generateRound1ForTournament above but no production code ever called it —
// a real tournament could sit at "registration-closed" forever. This is the
// one place that gap is closed: the exact same "self-resolve when accessed,
// no cron" principle Phase 7/8 already established for match resolution,
// round advancement, tournament finalization, reward granting, and
// Champions League creation, applied to the one remaining lifecycle step
// that never got it. Read-only until the registration window has genuinely
// closed (never generates early); a no-op for a League that has no current
// tournament at all (nobody registered this week) or whose tournament has
// already moved past registration-open/registration-closed. Never touches
// pairing/eligibility/cycle rules themselves — those stay exactly
// generateRound1ForTournament's/the schedule helpers' own job.
export async function ensureRound1GeneratedForActiveTournament(leagueId: RegionalLeagueId, now: Date = new Date()): Promise<void> {
  const window = getCurrentLeagueTournamentOccurrenceWindow(now);
  if (isLeagueRegistrationOpen(window, now)) return;

  const tournament = await getCurrentTournamentForLeague(leagueId, now);
  if (!tournament) return;
  if (tournament.status !== "registration-open" && tournament.status !== "registration-closed") return;

  try {
    await generateRound1ForTournament(tournament.id);
  } catch (error) {
    // RACE SAFETY — generateRound1ForTournament's own initial status read
    // happens outside its transaction, so two callers can both pass that
    // check before either commits. The DB's own @@unique([tournamentId,
    // roundNumber, slot]) constraint (unchanged, Phase 5) still guarantees
    // only one of them actually persists Round 1 — this only prevents the
    // LOSING caller's request from surfacing that as an unhandled error,
    // same create-then-catch-P2002 idiom every other exactly-once primitive
    // in this project already uses.
    if (!isUniqueConstraintViolation(error)) throw error;
  }
}

export async function getTournamentMatches(tournamentId: string, roundNumber: number): Promise<LeagueTournamentMatch[]> {
  return prisma.leagueTournamentMatch.findMany({ where: { tournamentId, roundNumber }, orderBy: { slot: "asc" } });
}

export async function getTournamentParticipants(tournamentId: string): Promise<LeagueTournamentParticipant[]> {
  return prisma.leagueTournamentParticipant.findMany({ where: { tournamentId }, orderBy: { registeredAt: "asc" } });
}
