import "server-only";

import { getStartingKnownMoves } from "@/engine/known-moves";
import { getMoveById } from "@/engine/moves";
import type { BattleEvent } from "@/features/battle/events/battle-event.types";
import { resolveBattleTurn, summarizeVolatile, type BattleVolatileSummary } from "@/features/battle/services/battle-turn-engine";
import type { MajorStatus } from "@/features/battle/status/major-status";
import { getUsableMoveIds } from "@/features/battle/volatile/move-legality";
import type { VolatileState } from "@/features/battle/volatile/volatile-condition.types";
import { selectNpcMoveForDifficulty } from "@/features/gyms/services/gym-npc-ai";
import { getKnownMoveIds } from "@/features/known-moves/known-moves-queries";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { prisma } from "@/lib/db/prisma";
import type { LeagueBattleSession, LeagueTournamentParticipant, Prisma } from "@/lib/generated/prisma/client";
import {
  leagueStatusFor,
  loadMatchContext,
  parseLeagueBattleHp,
  parseLeagueBattlePokemon,
  parseLeagueBattleStatStages,
  parseLeagueBattleStatusMap,
  parseLeagueBattleVolatileState,
  sideForPlayer,
} from "./league-battle-session.service";
import { resolveExpiredLeagueMatch } from "./league-match-resolution.service";
import type { LeagueBattleParticipantStatus, LeagueBattlePokemonSnapshot } from "../types/league-battle.types";
import { getLeagueMatchWindowState } from "../utils/league-match-window";

// GYMS & LEAGUES PHASE 6 — turn-by-turn PvP resolution. See
// LeagueBattleSession's own doc comment (prisma/schema.prisma) for the full
// "simultaneous submission, resolved once both sides have a pending move
// for the same turnNumber" architecture. This file is the ONLY place that
// architecture is implemented — everywhere else only ever reads the result.
//
// PVP TURN OWNERSHIP (section 9, documented per that section's explicit
// request): there is no single "whose turn is it" owner the way a
// strictly sequential game would have. Each side may submit independently
// at any time once the session is "in-progress"; a submission is recorded
// as that side's own pendingMoveId for the CURRENT turnNumber and nothing
// resolves yet if the other side hasn't submitted too. The moment BOTH
// sides have a pending move for the same turnNumber, resolveBattleTurn
// (Phase 3's shared engine) resolves the whole turn in one pass — the
// exact same "one engine call decides both sides' actions" semantics
// Field Battle/Gym Battle already use, just fed by two independently
// submitted moves instead of one submitted + one AI-picked. A computer
// opponent's "submission" is selected synchronously in the SAME request
// the real player's own move is recorded, so player-vs-computer always
// resolves immediately, never waiting.

export interface LeagueBattleTurnResult {
  readonly selfMoveId: string;
  readonly opponentMoveId: string;
  readonly selfDamageDealt: number;
  readonly opponentDamageDealt: number;
  readonly updatedSelfHp: number;
  readonly updatedOpponentHp: number;
  readonly selfStatus: MajorStatus | null;
  readonly opponentStatus: MajorStatus | null;
  readonly selfVolatile: BattleVolatileSummary;
  readonly opponentVolatile: BattleVolatileSummary;
  readonly selfActiveFainted: boolean;
  readonly opponentActiveFainted: boolean;
  readonly events: BattleEvent[];
}

export interface LeagueBattleActionSuccess {
  readonly status: "success";
  // False when this call only recorded the caller's own move and is now
  // waiting on the opponent (real PvP, opponent hasn't submitted yet) —
  // `turn` is absent in that case. True whenever a turn actually resolved
  // this call (always true for player-vs-computer).
  readonly resolved: boolean;
  readonly turn?: LeagueBattleTurnResult;
  readonly battleEnded: boolean;
  readonly winnerSide: "self" | "opponent" | null;
  // True exactly when THIS call is what completed the match — the one
  // moment the LeagueTournamentMatch/session are ever marked completed
  // (section 14/15).
  readonly victoryCompleted: boolean;
}

export type LeagueBattleActionResult =
  | LeagueBattleActionSuccess
  | { status: "no-session" }
  | { status: "not-a-participant" }
  | { status: "match-already-completed" }
  | { status: "not-ready" }
  | { status: "already-submitted" }
  | { status: "invalid-active-pokemon" }
  | { status: "invalid-move"; moveId: string }
  // MATCH WINDOW ENFORCEMENT (section 3/27) — the 20-minute room window
  // has passed with the match still unresolved. This call itself just ran
  // it through league-match-resolution.service.ts's resolveExpiredLeagueMatch
  // (so a stale match self-resolves the instant anyone still tries to act
  // on it, per section 26) — the move submitted in THIS request is always
  // discarded, never raced through past the deadline.
  | { status: "match-expired"; winnerParticipantId: string | null };

interface SideView {
  readonly side: "A" | "B";
  readonly pokemon: readonly LeagueBattlePokemonSnapshot[];
  readonly activeSlotId: string | null;
  readonly battleHp: Record<string, number>;
  readonly statusMap: Record<string, LeagueBattleParticipantStatus>;
  readonly stages: Record<string, number>;
  readonly volatile: VolatileState;
}

function viewForSide(session: LeagueBattleSession, side: "A" | "B"): SideView {
  if (side === "A") {
    return {
      side,
      pokemon: parseLeagueBattlePokemon(session.participantAPokemon),
      activeSlotId: session.participantAActiveSlotId,
      battleHp: parseLeagueBattleHp(session.participantABattleHp),
      statusMap: parseLeagueBattleStatusMap(session.participantAStatusMap),
      stages: parseLeagueBattleStatStages(session.participantAStatStages),
      volatile: parseLeagueBattleVolatileState(session.participantAVolatileState),
    };
  }
  return {
    side,
    pokemon: parseLeagueBattlePokemon(session.participantBPokemon),
    activeSlotId: session.participantBActiveSlotId,
    battleHp: parseLeagueBattleHp(session.participantBBattleHp),
    statusMap: parseLeagueBattleStatusMap(session.participantBStatusMap),
    stages: parseLeagueBattleStatStages(session.participantBStatStages),
    volatile: parseLeagueBattleVolatileState(session.participantBVolatileState),
  };
}

function otherSide(side: "A" | "B"): "A" | "B" {
  return side === "A" ? "B" : "A";
}

async function usableMoveIdsFor(view: SideView, knownMoveIds: readonly string[]): Promise<string[]> {
  return getUsableMoveIds(knownMoveIds, view.volatile);
}

// MOVE VALIDATION (section 11) — reuses the exact existing move-ownership
// pipeline: real Known Moves (getKnownMoveIds) for a real player's active
// Pokémon, getStartingKnownMoves (the same static resolver Gym NPCs already
// use) for a computer's. No League-specific move data is ever built.
async function knownMoveIdsFor(activeSnapshot: LeagueBattlePokemonSnapshot): Promise<string[]> {
  if (activeSnapshot.playerPokemonId) {
    return getKnownMoveIds(activeSnapshot.playerPokemonId);
  }
  return getStartingKnownMoves(activeSnapshot.speciesId, activeSnapshot.level);
}

function activeSnapshotOf(view: SideView): LeagueBattlePokemonSnapshot | undefined {
  return view.pokemon.find((p) => p.slotId === view.activeSlotId);
}

// Computes whether `view`'s side has anyone usable left OTHER than the
// active slot — same "anyOtherPlayerPokemonUsable" shape
// gym-battle-action.service.ts already established, generalized to either
// side of a symmetric PvP match.
function hasOtherUsable(view: SideView, nextBattleHp: Record<string, number>): boolean {
  return Object.entries(nextBattleHp).some(([slotId, hp]) => slotId !== view.activeSlotId && hp > 0);
}

// Sets `side`'s own pending move for `turnNumber`, ONLY if that side hasn't
// already submitted one this turn — the WHERE clause itself is the atomic
// guard (section 10/15). Explicit branches rather than a computed Prisma
// field key, since Prisma's generated update-input types don't have an
// index signature for TypeScript to check a dynamic key against safely.
async function trySetPendingMove(sessionId: string, turnNumber: number, side: "A" | "B", moveId: string): Promise<number> {
  const result =
    side === "A"
      ? await prisma.leagueBattleSession.updateMany({
          where: { id: sessionId, turnNumber, participantAPendingMoveId: null },
          data: { participantAPendingMoveId: moveId },
        })
      : await prisma.leagueBattleSession.updateMany({
          where: { id: sessionId, turnNumber, participantBPendingMoveId: null },
          data: { participantBPendingMoveId: moveId },
        });
  return result.count;
}

export async function submitLeagueBattleAction(
  tournamentMatchId: string,
  playerId: string,
  moveId: string,
  randomSource?: () => number,
  now: Date = new Date()
): Promise<LeagueBattleActionResult> {
  const context = await loadMatchContext(tournamentMatchId);
  if (!context) return { status: "no-session" };
  const { match, participantA, participantB } = context;

  if (match.status === "completed") return { status: "match-already-completed" };

  // HARD DEADLINE (section 3) — never let an action race through past the
  // room's own close instant, even if both players joined well within the
  // window. Resolves the match right here rather than merely rejecting,
  // so the very next read (this same response) already reflects the real
  // final result.
  if (getLeagueMatchWindowState(match.scheduledAt, now) === "expired") {
    const resolution = await resolveExpiredLeagueMatch(match.id, now, randomSource);
    const winnerParticipantId = resolution.status === "resolved" ? resolution.winnerParticipantId : null;
    return { status: "match-expired", winnerParticipantId };
  }

  const mySide = sideForPlayer(participantA, participantB, playerId);
  if (!mySide) return { status: "not-a-participant" };

  let session = await prisma.leagueBattleSession.findUnique({ where: { tournamentMatchId } });
  if (!session) return { status: "no-session" };
  if (session.status !== "in-progress") return { status: "not-ready" };

  const myView = viewForSide(session, mySide);
  const myActive = activeSnapshotOf(myView);
  if (!myActive || (myView.battleHp[myActive.slotId] ?? 0) <= 0) {
    return { status: "invalid-active-pokemon" };
  }

  const myKnownMoveIds = await knownMoveIdsFor(myActive);
  if (!myKnownMoveIds.includes(moveId)) return { status: "invalid-move", moveId };
  const myUsableMoveIds = await usableMoveIdsFor(myView, myKnownMoveIds);
  if (!myUsableMoveIds.includes(moveId)) return { status: "invalid-move", moveId };

  // ACTION SECURITY / RACE PROTECTION (section 10/15) — the WHERE clause
  // itself is the atomic guard: only succeeds if this side hasn't already
  // submitted for the CURRENT turnNumber. A duplicate/stale retry from the
  // same side always finds count === 0 here (either its own earlier
  // pendingMoveId is still set, or turnNumber has already advanced past
  // what this call read) and is rejected rather than silently overwriting
  // a newer battle state.
  const guardedCount = await trySetPendingMove(session.id, session.turnNumber, mySide, moveId);
  if (guardedCount === 0) return { status: "already-submitted" };

  session = await prisma.leagueBattleSession.findUniqueOrThrow({ where: { id: session.id } });

  const opponentParticipant: LeagueTournamentParticipant = mySide === "A" ? participantB : participantA;
  const oppSide = otherSide(mySide);

  // Computer opponent — select its move synchronously now (never waits for
  // a second human), using the approved "hard" AI behavior (section 17),
  // reusing Gym's own difficulty-aware selector unmodified.
  if (opponentParticipant.participantType === "computer") {
    const oppView = viewForSide(session, oppSide);
    const oppActive = activeSnapshotOf(oppView);
    if (oppActive) {
      const oppKnownMoveIds = getStartingKnownMoves(oppActive.speciesId, oppActive.level);
      const oppUsableMoveIds = getUsableMoveIds(oppKnownMoveIds, oppView.volatile);
      const oppMoveId = selectNpcMoveForDifficulty(oppUsableMoveIds, "hard", randomSource);

      const oppGuardCount = await trySetPendingMove(session.id, session.turnNumber, oppSide, oppMoveId);
      if (oppGuardCount > 0) {
        session = await prisma.leagueBattleSession.findUniqueOrThrow({ where: { id: session.id } });
      }
    }
  }

  const mySideNow = viewForSide(session, mySide);
  const oppSideNow = viewForSide(session, oppSide);
  const myPendingMove = mySide === "A" ? session.participantAPendingMoveId : session.participantBPendingMoveId;
  const oppPendingMove = oppSide === "A" ? session.participantAPendingMoveId : session.participantBPendingMoveId;

  if (!oppPendingMove) {
    // Real opponent hasn't submitted yet — nothing to resolve.
    return { status: "success", resolved: false, battleEnded: false, winnerSide: null, victoryCompleted: false };
  }

  return resolveLeagueTurn(session, match.id, mySide, myPendingMove ?? moveId, oppPendingMove, mySideNow, oppSideNow, randomSource);
}

async function resolveLeagueTurn(
  session: LeagueBattleSession,
  matchId: string,
  mySide: "A" | "B",
  myMoveId: string,
  oppMoveId: string,
  myView: SideView,
  oppView: SideView,
  randomSource?: () => number
): Promise<LeagueBattleActionResult> {
  const myActive = activeSnapshotOf(myView);
  const oppActive = activeSnapshotOf(oppView);
  if (!myActive || !oppActive) return { status: "invalid-active-pokemon" };

  const mySpecies = getSpeciesById(myActive.speciesId);
  const oppSpecies = getSpeciesById(oppActive.speciesId);
  if (!mySpecies || !oppSpecies) return { status: "invalid-active-pokemon" };

  const myStatus = leagueStatusFor(myView.statusMap, myActive.slotId);
  const oppStatus = leagueStatusFor(oppView.statusMap, oppActive.slotId);
  const myKnownMoveIds = await knownMoveIdsFor(myActive);
  const oppKnownMoveIds = await knownMoveIdsFor(oppActive);

  const turnResult = resolveBattleTurn(
    {
      pokemonId: myActive.slotId,
      baseStats: mySpecies.baseStats,
      level: myActive.level,
      types: mySpecies.types,
      stages: myView.stages,
      status: myStatus.status,
      statusTurnsRemaining: myStatus.turnsRemaining,
      volatile: myView.volatile,
      currentHp: myView.battleHp[myActive.slotId] ?? 0,
      knownMoveIds: myKnownMoveIds,
      moveId: myMoveId,
    },
    {
      pokemonId: oppActive.slotId,
      baseStats: oppSpecies.baseStats,
      level: oppActive.level,
      types: oppSpecies.types,
      stages: oppView.stages,
      status: oppStatus.status,
      statusTurnsRemaining: oppStatus.turnsRemaining,
      volatile: oppView.volatile,
      currentHp: oppView.battleHp[oppActive.slotId] ?? 0,
      knownMoveIds: oppKnownMoveIds,
      moveId: oppMoveId,
    },
    randomSource
  );

  const nextMyBattleHp = { ...myView.battleHp, [myActive.slotId]: turnResult.player.updatedHp };
  const nextOppBattleHp = { ...oppView.battleHp, [oppActive.slotId]: turnResult.enemy.updatedHp };
  const nextMyStatusMap: Record<string, LeagueBattleParticipantStatus> = {
    ...myView.statusMap,
    [myActive.slotId]: { status: turnResult.player.status, turnsRemaining: turnResult.player.statusTurnsRemaining },
  };
  const nextOppStatusMap: Record<string, LeagueBattleParticipantStatus> = {
    ...oppView.statusMap,
    [oppActive.slotId]: { status: turnResult.enemy.status, turnsRemaining: turnResult.enemy.statusTurnsRemaining },
  };

  const myHasNoUsableLeft = turnResult.player.fainted && !hasOtherUsable(myView, nextMyBattleHp);
  const oppHasNoUsableLeft = turnResult.enemy.fainted && !hasOtherUsable(oppView, nextOppBattleHp);

  const battleEnded = myHasNoUsableLeft || oppHasNoUsableLeft;
  // A genuine simultaneous double-KO (both sides wiped out by the same
  // exchange) has no natural asymmetry to break the tie with in a
  // symmetric PvP match (unlike Gym's own player-vs-NPC priority rule) —
  // resolved by a single documented, deterministic convention: participant
  // A wins. Expected to be exceedingly rare (both actives' last hit
  // fainting each other AND neither side having any other living
  // Pokémon).
  const winnerSide: "self" | "opponent" | null = !battleEnded
    ? null
    : myHasNoUsableLeft && oppHasNoUsableLeft
      ? (mySide === "A" ? "self" : "opponent")
      : myHasNoUsableLeft
        ? "opponent"
        : "self";
  const victoryCompleted = battleEnded;

  const winnerParticipantId = !battleEnded
    ? null
    : winnerSide === "self"
      ? (mySide === "A" ? session.participantAId : session.participantBId)
      : mySide === "A"
        ? session.participantBId
        : session.participantAId;

  const dataForSide = (side: "A" | "B", battleHp: Record<string, number>, statusMap: Record<string, LeagueBattleParticipantStatus>) =>
    side === "A"
      ? {
          participantABattleHp: battleHp as unknown as Prisma.InputJsonValue,
          participantAStatusMap: statusMap as unknown as Prisma.InputJsonValue,
          participantAStatStages: turnResult.player.stages as unknown as Prisma.InputJsonValue,
          participantAVolatileState: turnResult.player.volatile as unknown as Prisma.InputJsonValue,
        }
      : {
          participantBBattleHp: battleHp as unknown as Prisma.InputJsonValue,
          participantBStatusMap: statusMap as unknown as Prisma.InputJsonValue,
          participantBStatStages: turnResult.player.stages as unknown as Prisma.InputJsonValue,
          participantBVolatileState: turnResult.player.volatile as unknown as Prisma.InputJsonValue,
        };
  const dataForOtherSide = (side: "A" | "B", battleHp: Record<string, number>, statusMap: Record<string, LeagueBattleParticipantStatus>) =>
    side === "A"
      ? {
          participantABattleHp: battleHp as unknown as Prisma.InputJsonValue,
          participantAStatusMap: statusMap as unknown as Prisma.InputJsonValue,
          participantAStatStages: turnResult.enemy.stages as unknown as Prisma.InputJsonValue,
          participantAVolatileState: turnResult.enemy.volatile as unknown as Prisma.InputJsonValue,
        }
      : {
          participantBBattleHp: battleHp as unknown as Prisma.InputJsonValue,
          participantBStatusMap: statusMap as unknown as Prisma.InputJsonValue,
          participantBStatStages: turnResult.enemy.stages as unknown as Prisma.InputJsonValue,
          participantBVolatileState: turnResult.enemy.volatile as unknown as Prisma.InputJsonValue,
        };

  const oppSide = otherSide(mySide);

  const updateData: Prisma.LeagueBattleSessionUpdateManyMutationInput = {
    ...dataForSide(mySide, nextMyBattleHp, nextMyStatusMap),
    ...dataForOtherSide(oppSide, nextOppBattleHp, nextOppStatusMap),
    participantAPendingMoveId: null,
    participantBPendingMoveId: null,
    ...(battleEnded
      ? { status: "completed", winnerParticipantId, completedAt: new Date() }
      : { turnNumber: { increment: 1 } }),
  };

  // RACE/STALE PROTECTION (section 15) — the turnNumber-gated WHERE clause
  // is the same optimistic-concurrency guard the submission step above
  // uses; a resolution can only ever apply once for a given turnNumber,
  // even if (in theory) two requests both believed they were the one to
  // complete the pair.
  const applied = await prisma.leagueBattleSession.updateMany({
    where: { id: session.id, turnNumber: session.turnNumber },
    data: updateData,
  });

  if (applied.count === 0) {
    return { status: "already-submitted" };
  }

  if (battleEnded) {
    // MATCH VICTORY (section 14) — exactly once, atomically alongside the
    // session's own completion above: the match row transitions to
    // completed with the SAME winnerParticipantId. No bracket advancement,
    // no reward of any kind (sections 24/25/26) — this is the full extent
    // of what a completed League PvP match does in this Phase.
    await prisma.leagueTournamentMatch.updateMany({
      where: { id: matchId, status: { not: "completed" } },
      data: { status: "completed", winnerParticipantId, resolutionReason: "normal-battle" },
    });
  }

  return {
    status: "success",
    resolved: true,
    turn: {
      selfMoveId: myMoveId,
      opponentMoveId: oppMoveId,
      selfDamageDealt: turnResult.player.damageDealt,
      opponentDamageDealt: turnResult.enemy.damageDealt,
      updatedSelfHp: turnResult.player.updatedHp,
      updatedOpponentHp: turnResult.enemy.updatedHp,
      selfStatus: turnResult.player.status,
      opponentStatus: turnResult.enemy.status,
      selfVolatile: summarizeVolatile(turnResult.player.volatile),
      opponentVolatile: summarizeVolatile(turnResult.enemy.volatile),
      selfActiveFainted: turnResult.player.fainted,
      opponentActiveFainted: turnResult.enemy.fainted,
      events: turnResult.events,
    },
    battleEnded,
    winnerSide,
    victoryCompleted,
  };
}

export type SwitchLeagueBattleActivePokemonResult = { status: "ok" } | { status: "not-owned" } | { status: "no-session" } | { status: "not-a-participant" };

// FORCED REPLACEMENT (section 13) — same pattern
// switchNpcBattleActivePokemon (Gym Battle) already established: the new
// active slot must belong to this side's OWN snapshotted roster and still
// be alive; stat stages/volatile reset for whoever becomes active, status
// persists per-slot (never reset by a switch).
export async function switchLeagueBattleActivePokemon(
  tournamentMatchId: string,
  playerId: string,
  slotId: string
): Promise<SwitchLeagueBattleActivePokemonResult> {
  const context = await loadMatchContext(tournamentMatchId);
  if (!context) return { status: "no-session" };
  const { participantA, participantB } = context;

  const mySide = sideForPlayer(participantA, participantB, playerId);
  if (!mySide) return { status: "not-a-participant" };

  const session = await prisma.leagueBattleSession.findUnique({ where: { tournamentMatchId } });
  if (!session) return { status: "no-session" };

  const myView = viewForSide(session, mySide);
  const owns = myView.pokemon.some((p) => p.slotId === slotId);
  const alive = (myView.battleHp[slotId] ?? 0) > 0;
  if (!owns || !alive) return { status: "not-owned" };

  const data =
    mySide === "A"
      ? { participantAActiveSlotId: slotId, participantAStatStages: {}, participantAVolatileState: {} }
      : { participantBActiveSlotId: slotId, participantBStatStages: {}, participantBVolatileState: {} };

  await prisma.leagueBattleSession.updateMany({ where: { id: session.id }, data });
  return { status: "ok" };
}
