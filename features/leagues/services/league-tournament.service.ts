import "server-only";

import { getPlayerLevel } from "@/features/player-progression/progression-service";
import { prisma } from "@/lib/db/prisma";
import type { LeagueTournament, LeagueTournamentMatch, LeagueTournamentParticipant } from "@/lib/generated/prisma/client";
import { MIN_LEAGUE_PLAYER_LEVEL } from "../config/league-access-rules.config";
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
  // PLAYER LEVEL ACCESS REQUIREMENTS — below MIN_LEAGUE_PLAYER_LEVEL. Kept
  // distinct from "ineligible" (badge/regional-champion based) — these are
  // two different reasons a player can't register, same way Gyms keeps
  // "locked-level" distinct from "locked-previous-region".
  | { status: "below-min-level" }
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

  // PLAYER LEVEL ACCESS REQUIREMENTS — checked before badge/champion
  // eligibility, so a below-level player always sees the level reason
  // first regardless of their own badge progress (mirrors Gyms' own
  // level-gate-first ordering in startNpcBattle).
  const playerLevel = await getPlayerLevel(playerId);
  if (playerLevel < MIN_LEAGUE_PLAYER_LEVEL) {
    return { status: "below-min-level" };
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

// LEAGUE LEGACY REGISTRATION — CANCEL BUTTON FIX (later task) — finds a
// player's own STILL-LIVE registration for `leagueId`, regardless of WHICH
// week's LeagueTournament it lives on. getCurrentTournamentForLeague above
// is deliberately week-scoped (it only ever looks at THIS WEEK's own
// (leagueId, weekKey) row) — correct for "is a NEW registration open right
// now", but wrong for "does this player already have an existing
// registration": a player who registered for League I before the
// active-week-only rule existed (or simply during League I's own past
// week) still has a real LeagueTournamentParticipant row sitting on that
// OLD week's tournament, which this week's lookup can never find once the
// cycle has moved on to League II/III. Scoped to every status except
// "completed" — registration-open/registration-closed/generated are all
// still a genuine, currently-relevant registration (the UI's own "נרשמת
// לליגה" should keep showing even after Round 1 is generated; only the
// separate CANCELLABILITY of it narrows further, via
// isTournamentStillCancellable below). At most one such row should exist
// per (player, League) at a time in practice; sorted by createdAt so a
// genuinely anomalous multiple-row case still resolves deterministically
// to the most recent one rather than arbitrarily.
export async function getPendingRegisteredTournamentForLeague(playerId: string, leagueId: RegionalLeagueId): Promise<LeagueTournament | null> {
  const participantRows = await prisma.leagueTournamentParticipant.findMany({ where: { playerId, participantType: "player" } });
  if (participantRows.length === 0) return null;

  const tournamentIds = participantRows.map((row) => row.tournamentId);
  const tournaments = await prisma.leagueTournament.findMany({
    where: { leagueId, id: { in: tournamentIds }, status: { not: "completed" } },
  });

  const sorted = [...tournaments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return sorted[0] ?? null;
}

// Read-only view of whether `tournament` (the player's own pending
// registration, if any) could actually be cancelled right now — the SAME
// two rules cancelLeagueRegistration itself enforces, mirrored here so the
// UI can decide button visibility without ever needing to know about
// "this week's active League" for an existing (possibly stale) registration.
// Never trusted as the real authorization — cancelLeagueRegistration
// re-validates both checks itself regardless, same "display flag is a
// hint, the server re-derives everything" convention this codebase already
// follows everywhere else.
export function isTournamentStillCancellable(tournament: LeagueTournament, now: Date): boolean {
  if (tournament.status !== "registration-open") return false;
  return isLeagueRegistrationOpen({ registrationClosesAt: tournament.registrationClosesAt, round1StartsAt: tournament.round1StartsAt }, now);
}

export type CancelLeagueRegistrationResult =
  | { status: "cancelled" }
  // IDEMPOTENT (section "cancellation should be idempotent/safe if already
  // unregistered") — no tournament exists yet for this League's current
  // week, or one exists but this player never registered (or already
  // cancelled) — either way, a safe no-op, never an error.
  | { status: "not-registered" }
  | { status: "registration-closed" }
  // Round 1 already generated for this tournament — cancelling now would
  // leave a bracket referencing a participant who quietly vanished mid-
  // tournament, so this is rejected once the tournament has moved past
  // "registration-open", exactly the same status transition
  // generateRound1ForTournament itself performs.
  | { status: "round1-already-generated" }
  | { status: "champions-league-not-cancellable" }
  | { status: "invalid-league" };

// CANCEL REGISTRATION — playerId always comes from the authenticated
// session (see cancelLeagueRegistrationAction), so this can structurally
// only ever remove the CALLING player's own participant row — never
// another player's, and never the tournament row itself (only
// LeagueTournamentParticipant.deleteMany, scoped to tournamentId+playerId,
// is ever touched). Reuses the exact SAME LeagueTournamentParticipant
// table registerForLeague writes to — no second/duplicate registration
// table. Never touches Gym progression or League eligibility in any way.
//
// LEAGUE LEGACY REGISTRATION — CANCEL BUTTON FIX (later task) — looks up
// the player's own PENDING registration via getPendingRegisteredTournamentForLeague
// (any week, never "this week only") rather than getCurrentTournamentForLeague
// (this-week-only) — a registration from a week whose League is no longer
// this cycle's active one must still be cancellable. The deadline/status
// checks below are against THAT tournament's own stored
// registrationClosesAt/status (isTournamentStillCancellable), never a
// freshly-recomputed "this week's" window — correct regardless of which
// week the registration actually lives on.
export async function cancelLeagueRegistration(playerId: string, leagueId: LeagueId, now: Date = new Date()): Promise<CancelLeagueRegistrationResult> {
  if (leagueId === CHAMPIONS_LEAGUE.id) {
    return { status: "champions-league-not-cancellable" };
  }

  const league = REGIONAL_LEAGUES.find((candidate) => candidate.id === leagueId);
  if (!league) {
    return { status: "invalid-league" };
  }

  const tournament = await getPendingRegisteredTournamentForLeague(playerId, league.id);
  if (!tournament) {
    return { status: "not-registered" };
  }

  // "Allowed only while registration is still open" — checked BEFORE the
  // idempotent not-registered case below so a genuine after-close cancel
  // attempt is always rejected, never silently treated as a no-op.
  if (!isLeagueRegistrationOpen({ registrationClosesAt: tournament.registrationClosesAt, round1StartsAt: tournament.round1StartsAt }, now)) {
    return { status: "registration-closed" };
  }

  if (tournament.status !== "registration-open") {
    return { status: "round1-already-generated" };
  }

  const deleted = await prisma.leagueTournamentParticipant.deleteMany({
    where: { tournamentId: tournament.id, playerId, participantType: "player" },
  });

  return { status: deleted.count > 0 ? "cancelled" : "not-registered" };
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
