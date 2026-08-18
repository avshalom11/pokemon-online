import "server-only";

import { calculatePokemonStats } from "@/engine/battle/pokemon-stat-calculations";
import type { MajorStatus } from "@/features/battle/status/major-status";
import { resolveKnownMoveSlots, type BattleKnownMoveSlot } from "@/features/battle/services/battle-view.service";
import { getFrontSpritePath, getBackSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import {
  getLeagueBattleSession,
  leagueStatusFor,
  loadMatchContext,
  parseLeagueBattleHp,
  parseLeagueBattlePokemon,
  parseLeagueBattleStatusMap,
  sideForPlayer,
} from "./league-battle-session.service";
import type { LeagueBattlePokemonSnapshot } from "../types/league-battle.types";
import { getLeagueMatchWindowState, type LeagueMatchWindowState } from "../utils/league-match-window";

// GYMS & LEAGUES PHASE 6 — the server-side assembler for the League match
// screen (section 19). Turns the live LeagueBattleSession (Phase 6) plus
// static species/move data into a display-ready view model — the client
// component never touches Prisma or the session row directly, same
// "page/service assembles, client component only renders + calls actions"
// split gym-battle-view.service.ts already established.

export interface LeagueBattleParticipantView {
  readonly slotId: string;
  readonly speciesId: string;
  readonly name: string;
  readonly level: number;
  readonly frontSpriteUrl: string;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly fainted: boolean;
  readonly isActive: boolean;
}

export interface LeagueBattleSideView {
  readonly joined: boolean;
  readonly isComputer: boolean;
  readonly activeName: string;
  readonly activeLevel: number;
  readonly activeSpriteUrl: string;
  readonly activeBackSpriteUrl?: string;
  readonly activeCurrentHp: number;
  readonly activeMaxHp: number;
  readonly activeStatus: MajorStatus | null;
  readonly participants: readonly LeagueBattleParticipantView[];
}

export interface LeagueBattleViewData {
  readonly matchId: string;
  readonly status: "waiting-for-players" | "in-progress" | "completed";
  // GYMS & LEAGUES PHASE 7 — the match room's own window state (section
  // 2/28), always derived server-side from match.scheduledAt — the client
  // never computes this itself.
  readonly roomState: LeagueMatchWindowState;
  readonly self: LeagueBattleSideView;
  readonly opponent: LeagueBattleSideView;
  readonly knownMoves: readonly BattleKnownMoveSlot[];
  readonly winnerSide: "self" | "opponent" | null;
  readonly resolutionReason: string | null;
  readonly playerName: string;
}

export type LeagueBattleViewResult =
  | { status: "ready"; data: LeagueBattleViewData }
  | { status: "not-a-participant" }
  | { status: "match-not-found" }
  | { status: "no-session" };

function maxHpFor(speciesId: string, level: number): number {
  const species = getSpeciesById(speciesId);
  if (!species) return 0;
  return calculatePokemonStats({ baseStats: species.baseStats, level }).maxHp;
}

function buildSideView(
  joined: boolean,
  isComputer: boolean,
  pokemon: readonly LeagueBattlePokemonSnapshot[],
  activeSlotId: string | null,
  battleHp: Record<string, number>,
  statusMap: Record<string, { status: MajorStatus | null; turnsRemaining: number | null }>
): LeagueBattleSideView {
  const participants: LeagueBattleParticipantView[] = pokemon.map((p) => {
    const species = getSpeciesById(p.speciesId);
    return {
      slotId: p.slotId,
      speciesId: p.speciesId,
      name: species?.name ?? p.speciesId,
      level: p.level,
      frontSpriteUrl: species ? getFrontSpritePath(species) : "",
      currentHp: battleHp[p.slotId] ?? 0,
      maxHp: maxHpFor(p.speciesId, p.level),
      fainted: (battleHp[p.slotId] ?? 0) <= 0,
      isActive: p.slotId === activeSlotId,
    };
  });

  const active = participants.find((p) => p.isActive) ?? participants[0];
  const activeSnapshot = pokemon.find((p) => p.slotId === activeSlotId);
  const activeSpecies = activeSnapshot ? getSpeciesById(activeSnapshot.speciesId) : undefined;

  return {
    joined,
    isComputer,
    activeName: active?.name ?? "",
    activeLevel: active?.level ?? 0,
    activeSpriteUrl: activeSpecies ? getFrontSpritePath(activeSpecies) : "",
    activeBackSpriteUrl: activeSpecies ? getBackSpritePath(activeSpecies) : undefined,
    activeCurrentHp: active?.currentHp ?? 0,
    activeMaxHp: active?.maxHp ?? 0,
    activeStatus: activeSlotId ? leagueStatusFor(statusMap, activeSlotId).status : null,
    participants,
  };
}

export async function getLeagueBattleViewData(matchId: string, playerId: string, playerName: string): Promise<LeagueBattleViewResult> {
  const context = await loadMatchContext(matchId);
  if (!context) return { status: "match-not-found" };
  const { match, participantA, participantB } = context;

  const mySide = sideForPlayer(participantA, participantB, playerId);
  if (!mySide) return { status: "not-a-participant" };

  const roomState = getLeagueMatchWindowState(match.scheduledAt);
  const session = await getLeagueBattleSession(matchId);

  // A no-show resolution (section 5/6) can complete a match without ever
  // creating a LeagueBattleSession at all (neither/only one side ever
  // joined) — the result is still real and must still be shown (section
  // 28's "if a match has already been resolved by timeout/no-show, the
  // page should display the persisted result"), so this builds a minimal
  // view straight from the match row instead of reporting "no-session".
  if (!session) {
    if (match.status !== "completed") return { status: "no-session" };

    const emptySide = (isComputer: boolean): LeagueBattleSideView => ({
      joined: false,
      isComputer,
      activeName: "",
      activeLevel: 0,
      activeSpriteUrl: "",
      activeCurrentHp: 0,
      activeMaxHp: 0,
      activeStatus: null,
      participants: [],
    });

    const opponentParticipant = mySide === "A" ? participantB : participantA;
    const winnerSide: "self" | "opponent" | null =
      match.winnerParticipantId === null ? null : match.winnerParticipantId === (mySide === "A" ? match.participantAId : match.participantBId) ? "self" : "opponent";

    return {
      status: "ready",
      data: {
        matchId,
        status: "completed",
        roomState,
        self: emptySide(false),
        opponent: emptySide(opponentParticipant.participantType === "computer"),
        knownMoves: [],
        winnerSide,
        resolutionReason: match.resolutionReason,
        playerName,
      },
    };
  }

  const oppSide = mySide === "A" ? "B" : "A";
  const opponentParticipant = mySide === "A" ? participantB : participantA;

  const mySnapshot = mySide === "A" ? session.participantAPokemon : session.participantBPokemon;
  const myActiveSlotId = mySide === "A" ? session.participantAActiveSlotId : session.participantBActiveSlotId;
  const myHp = mySide === "A" ? session.participantABattleHp : session.participantBBattleHp;
  const myStatusMap = mySide === "A" ? session.participantAStatusMap : session.participantBStatusMap;
  const myJoined = mySide === "A" ? session.participantAJoinedAt !== null : session.participantBJoinedAt !== null;

  const oppSnapshot = oppSide === "A" ? session.participantAPokemon : session.participantBPokemon;
  const oppActiveSlotId = oppSide === "A" ? session.participantAActiveSlotId : session.participantBActiveSlotId;
  const oppHp = oppSide === "A" ? session.participantABattleHp : session.participantBBattleHp;
  const oppStatusMap = oppSide === "A" ? session.participantAStatusMap : session.participantBStatusMap;
  const oppJoined = oppSide === "A" ? session.participantAJoinedAt !== null : session.participantBJoinedAt !== null;

  const self = buildSideView(myJoined, false, parseLeagueBattlePokemon(mySnapshot), myActiveSlotId, parseLeagueBattleHp(myHp), parseLeagueBattleStatusMap(myStatusMap));
  const opponent = buildSideView(
    oppJoined,
    opponentParticipant.participantType === "computer",
    parseLeagueBattlePokemon(oppSnapshot),
    oppActiveSlotId,
    parseLeagueBattleHp(oppHp),
    parseLeagueBattleStatusMap(oppStatusMap)
  );

  const myActiveSnapshot = parseLeagueBattlePokemon(mySnapshot).find((p) => p.slotId === myActiveSlotId);
  const knownMoves = myActiveSnapshot?.playerPokemonId ? await resolveKnownMoveSlots(myActiveSnapshot.playerPokemonId) : [];

  const winnerSide: "self" | "opponent" | null =
    session.winnerParticipantId === null
      ? null
      : session.winnerParticipantId === (mySide === "A" ? match.participantAId : match.participantBId)
        ? "self"
        : "opponent";

  return {
    status: "ready",
    data: {
      matchId,
      status: session.status as "waiting-for-players" | "in-progress" | "completed",
      roomState,
      self,
      opponent,
      knownMoves,
      winnerSide,
      resolutionReason: match.resolutionReason,
      playerName,
    },
  };
}
