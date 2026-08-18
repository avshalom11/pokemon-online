import "server-only";

import { calculatePokemonStats } from "@/engine/battle/pokemon-stat-calculations";
import type { MajorStatus } from "@/features/battle/status/major-status";
import type { VolatileState } from "@/features/battle/volatile/volatile-condition.types";
import { getAllOwnedPokemon, getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getPlayerLevel } from "@/features/player-progression/progression-service";
import { prisma } from "@/lib/db/prisma";
import type { LeagueBattleSession, LeagueTournamentMatch, LeagueTournamentParticipant, Prisma } from "@/lib/generated/prisma/client";
import { MAX_ACTIVE_TEAM_SIZE } from "@/shared/types/player";
import { REGIONAL_LEAGUES } from "../data/league-registry";
import { computerSlotId, generateComputerTeam, type ComputerTeamMember } from "./league-computer-team.service";
import type { LeagueBattleParticipantStatus, LeagueBattlePokemonSnapshot } from "../types/league-battle.types";
import { getLeagueMatchWindowState } from "../utils/league-match-window";

// GYMS & LEAGUES PHASE 6 — the join/session-lifecycle half of League PvP.
// Turn-by-turn action resolution lives in league-battle-action.service.ts;
// this file owns: validating a join attempt against the real
// LeagueTournamentMatch/Participant rows (section 2/3), creating the
// session exactly once per match (race-safe, section 7), snapshotting each
// real side's CURRENT party at their own join moment (section 4/5), and
// immediately auto-joining a computer-filler opponent the instant the real
// side joins (section 22).

function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

export type JoinLeagueMatchResult =
  | { status: "joined"; session: LeagueBattleSession }
  | { status: "not-a-participant" }
  | { status: "match-not-found" }
  | { status: "match-already-completed" }
  | { status: "no-usable-party" }
  // MATCH ROOM AVAILABILITY (section 2) — before scheduledAt, no join may
  // create/start gameplay at all.
  | { status: "room-not-open-yet" }
  // The 20-minute room window has passed without the match completing
  // normally — a HARD deadline (section 3): no new join may resume
  // gameplay past it. The caller (the match page) is expected to run this
  // match through league-match-resolution.service.ts's own
  // resolveExpiredLeagueMatch first, which is what actually turns this
  // into a real persisted winner — this status alone never mutates
  // anything.
  | { status: "room-expired" };

interface SideSnapshot {
  readonly pokemon: LeagueBattlePokemonSnapshot[];
  readonly battleHp: Record<string, number>;
  readonly activeSlotId: string;
}

// PARTY RULES (section 4) — the player's CURRENT party, first N valid
// slots (N = MAX_ACTIVE_TEAM_SIZE, League PvP is always up to 6), in
// existing party-slot order. Never mutates the real party. Snapshotted
// once, right here, at this side's own join moment — later party edits
// can never retroactively change an already-joined session (this function
// is never called again for a side that already has a snapshot).
async function buildRealPlayerSnapshot(playerId: string): Promise<SideSnapshot | null> {
  const party = await getPlayerParty(playerId);
  const participants = party.slice(0, MAX_ACTIVE_TEAM_SIZE);
  if (participants.length === 0) return null;

  const pokemon: LeagueBattlePokemonSnapshot[] = participants.map((p) => ({
    slotId: p.id,
    speciesId: p.species.id,
    level: p.level,
    playerPokemonId: p.id,
  }));

  // FULL HP AT START (section 5) — battle-local only; PlayerPokemon.currentHp
  // is never read or written here, exactly like NpcBattleSession.
  const battleHp: Record<string, number> = {};
  for (const p of participants) {
    battleHp[p.id] = calculatePokemonStats({ baseStats: p.species.baseStats, level: p.level }).maxHp;
  }

  return { pokemon, battleHp, activeSlotId: pokemon[0].slotId };
}

function buildComputerSnapshot(members: readonly ComputerTeamMember[]): SideSnapshot {
  const pokemon: LeagueBattlePokemonSnapshot[] = members.map((member, index) => ({
    slotId: computerSlotId(index),
    speciesId: member.speciesId,
    level: member.level,
  }));

  const battleHp: Record<string, number> = {};
  members.forEach((member, index) => {
    const species = getSpeciesById(member.speciesId);
    battleHp[computerSlotId(index)] = species ? calculatePokemonStats({ baseStats: species.baseStats, level: member.level }).maxHp : 0;
  });

  return { pokemon, battleHp, activeSlotId: pokemon[0]?.slotId ?? computerSlotId(0) };
}

// MATCH SOURCE OF TRUTH (section 2) — every field this returns comes
// straight from the real LeagueTournamentMatch/Participant rows; a client
// never supplies an opponent id, a team, or a party — only a matchId and
// its own authenticated playerId.
async function loadMatchContext(
  tournamentMatchId: string
): Promise<{ match: LeagueTournamentMatch; participantA: LeagueTournamentParticipant; participantB: LeagueTournamentParticipant } | null> {
  const match = await prisma.leagueTournamentMatch.findUnique({ where: { id: tournamentMatchId } });
  if (!match) return null;

  const [participantA, participantB] = await Promise.all([
    prisma.leagueTournamentParticipant.findUnique({ where: { id: match.participantAId } }),
    prisma.leagueTournamentParticipant.findUnique({ where: { id: match.participantBId } }),
  ]);
  if (!participantA || !participantB) return null;

  return { match, participantA, participantB };
}

// Race-safe get-or-create (section 7, item 4) — the same create-then-
// catch-P2002 idiom Phase 4/5 already established, keyed on the model's
// own tournamentMatchId @unique constraint. Whichever concurrent join
// attempt loses the race simply re-reads the row the winner created.
async function getOrCreateSession(tournamentMatchId: string, participantAId: string, participantBId: string): Promise<LeagueBattleSession> {
  try {
    return await prisma.leagueBattleSession.create({
      data: { tournamentMatchId, participantAId, participantBId },
    });
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) throw error;
    return prisma.leagueBattleSession.findUniqueOrThrow({ where: { tournamentMatchId } });
  }
}

async function joinSide(sessionId: string, side: "A" | "B", snapshot: SideSnapshot, joinedAt: Date): Promise<LeagueBattleSession> {
  const data =
    side === "A"
      ? {
          participantAJoinedAt: joinedAt,
          participantAPokemon: snapshot.pokemon as unknown as Prisma.InputJsonValue,
          participantABattleHp: snapshot.battleHp as unknown as Prisma.InputJsonValue,
          participantAActiveSlotId: snapshot.activeSlotId,
        }
      : {
          participantBJoinedAt: joinedAt,
          participantBPokemon: snapshot.pokemon as unknown as Prisma.InputJsonValue,
          participantBBattleHp: snapshot.battleHp as unknown as Prisma.InputJsonValue,
          participantBActiveSlotId: snapshot.activeSlotId,
        };

  return prisma.leagueBattleSession.update({ where: { id: sessionId }, data });
}

// BATTLE START / JOIN FLOW (section 7) + COMPUTER MATCH START (section 22)
// — the one entry point a real participant calls to enter their assigned
// match. First eligible call creates the session; a second real
// participant's call joins the SAME session. If the opponent is a
// computer, it is snapshotted and marked joined in this same call, the
// instant the real side joins — no waiting for a second human ever
// applies to a computer opponent.
export async function joinLeagueMatch(tournamentMatchId: string, playerId: string, now: Date = new Date()): Promise<JoinLeagueMatchResult> {
  const context = await loadMatchContext(tournamentMatchId);
  if (!context) return { status: "match-not-found" };
  const { match, participantA, participantB } = context;

  if (match.status === "completed") return { status: "match-already-completed" };

  const windowState = getLeagueMatchWindowState(match.scheduledAt, now);
  if (windowState === "not-open-yet") return { status: "room-not-open-yet" };
  if (windowState === "expired") return { status: "room-expired" };

  const isA = participantA.playerId === playerId;
  const isB = participantB.playerId === playerId;
  if (!isA && !isB) return { status: "not-a-participant" };

  const realSnapshot = await buildRealPlayerSnapshot(playerId);
  if (!realSnapshot) return { status: "no-usable-party" };

  let session = await getOrCreateSession(match.id, match.participantAId, match.participantBId);

  const mySide: "A" | "B" = isA ? "A" : "B";
  const myAlreadyJoined = mySide === "A" ? session.participantAJoinedAt !== null : session.participantBJoinedAt !== null;
  if (!myAlreadyJoined) {
    session = await joinSide(session.id, mySide, realSnapshot, now);
  }

  const otherSide: "A" | "B" = mySide === "A" ? "B" : "A";
  const otherParticipant = mySide === "A" ? participantB : participantA;
  const otherAlreadyJoined = otherSide === "A" ? session.participantAJoinedAt !== null : session.participantBJoinedAt !== null;

  if (otherParticipant.participantType === "computer" && !otherAlreadyJoined) {
    const tournament = await prisma.leagueTournament.findUniqueOrThrow({ where: { id: match.tournamentId } });
    const league = REGIONAL_LEAGUES.find((candidate) => candidate.id === tournament.leagueId);
    if (league) {
      const playerLevel = await getPlayerLevel(playerId);
      const computerMembers = generateComputerTeam(league, realSnapshot.pokemon.length, playerLevel);
      session = await joinSide(session.id, otherSide, buildComputerSnapshot(computerMembers), now);
    }
  }

  // WHEN CAN ATTACKING BEGIN? (section 8) — both sides joined -> in-progress.
  if (session.participantAJoinedAt && session.participantBJoinedAt && session.status === "waiting-for-players") {
    session = await prisma.leagueBattleSession.update({ where: { id: session.id }, data: { status: "in-progress" } });
  }

  return { status: "joined", session };
}

export async function getLeagueBattleSession(tournamentMatchId: string): Promise<LeagueBattleSession | null> {
  return prisma.leagueBattleSession.findUnique({ where: { tournamentMatchId } });
}

// ACTIVE-BATTLE NAVIGATION LOCK (section 20) — seeds the SAME generic
// ActiveBattleProvider Field Battle/Gym Battle already use (see
// app/(game)/layout.tsx), for a hard refresh landing mid-League-match.
// Deliberately two simple findMany calls + in-memory filtering rather than
// an OR/in Prisma query — keeps this correct against both the real client
// and the in-memory test fake without needing either to support compound
// filter operators just for this one read.
export async function hasActiveLeagueBattleSession(playerId: string): Promise<boolean> {
  const participants = await prisma.leagueTournamentParticipant.findMany({ where: { playerId }, select: { id: true } });
  if (participants.length === 0) return false;
  const participantIds = new Set(participants.map((p) => p.id));

  const inProgressSessions = await prisma.leagueBattleSession.findMany({ where: { status: "in-progress" } });
  return inProgressSessions.some((session) => participantIds.has(session.participantAId) || participantIds.has(session.participantBId));
}

function parseJsonRecord<T>(value: Prisma.JsonValue, fallback: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  return value as unknown as T;
}

function parseSnapshotArray(value: Prisma.JsonValue): LeagueBattlePokemonSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).slotId === "string") {
      return [entry as unknown as LeagueBattlePokemonSnapshot];
    }
    return [];
  });
}

export function parseLeagueBattleHp(value: Prisma.JsonValue | null): Record<string, number> {
  return value ? parseJsonRecord<Record<string, number>>(value, {}) : {};
}

export function parseLeagueBattleStatusMap(value: Prisma.JsonValue): Record<string, LeagueBattleParticipantStatus> {
  return parseJsonRecord<Record<string, LeagueBattleParticipantStatus>>(value, {});
}

export function parseLeagueBattleStatStages(value: Prisma.JsonValue) {
  return parseJsonRecord<Record<string, number>>(value, {});
}

export function parseLeagueBattleVolatileState(value: Prisma.JsonValue): VolatileState {
  return parseJsonRecord<VolatileState>(value, {});
}

export function parseLeagueBattlePokemon(value: Prisma.JsonValue | null): LeagueBattlePokemonSnapshot[] {
  return value ? parseSnapshotArray(value) : [];
}

const EMPTY_PARTICIPANT_STATUS: LeagueBattleParticipantStatus = { status: null, turnsRemaining: null };

export function leagueStatusFor(map: Record<string, LeagueBattleParticipantStatus>, slotId: string): LeagueBattleParticipantStatus {
  return map[slotId] ?? EMPTY_PARTICIPANT_STATUS;
}

// Resolves which side of a match `playerId` actually is — null covers both
// a stranger AND a computer side (playerId null on a computer participant
// row never matches a real caller's own id). Used by every action-
// submission entry point so "act only for your own participant" (section
// 10) is enforced from a single, shared helper rather than re-derived
// per call site.
export function sideForPlayer(participantA: LeagueTournamentParticipant, participantB: LeagueTournamentParticipant, playerId: string): "A" | "B" | null {
  if (participantA.playerId === playerId) return "A";
  if (participantB.playerId === playerId) return "B";
  return null;
}

export { loadMatchContext };
