import "server-only";

import { calculatePokemonStats } from "@/engine/battle/pokemon-stat-calculations";
import type { MajorStatus } from "@/features/battle/status/major-status";
import { getBackSpritePath, getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { resolveKnownMoveSlots, type BattleKnownMoveSlot } from "@/features/battle/services/battle-view.service";
import { GYM_BATTLE_SLOT_LABELS_HE, REGION_DISPLAY_NAMES_HE, regionalChampionLabelHe } from "../data/gym-labels";
import { toRegionId, type RegionId } from "@/shared/types/region";
import type { GymBattleSlotId } from "../types/gym.types";
import {
  getNpcBattleSession,
  getParticipatingParty,
  parseNpcBattleHpMap,
  parseNpcBattleStatusMap,
  parseNpcTeam,
  statusFor,
} from "./gym-battle-session.service";

// GYMS & LEAGUES PHASE 4 — the server-side assembler for the /gyms/battle
// screen (section 10 of this Phase's spec). Reads the live NpcBattleSession
// (Phase 3) plus static species/move data and turns it into a display-ready
// view model — GymBattleContent (the client component) never touches
// Prisma or the session row directly, same "page/service assembles, client
// component only renders + calls actions" split every other battle screen
// in this codebase already follows (see battle-view.service.ts).

export interface GymBattleParticipantView {
  readonly id: string;
  readonly speciesId: string;
  readonly name: string;
  readonly level: number;
  readonly frontSpriteUrl: string;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly fainted: boolean;
  readonly isActive: boolean;
}

export interface GymBattleViewData {
  readonly battleSource: "gym" | "regional-champion";
  readonly regionId: RegionId;
  readonly gymNumber: 1 | 2 | 3 | null;
  readonly contextLabel: string;
  readonly npcTeamTotalCount: number;
  // Includes the currently-active NPC (matches gym-battle-action.service's
  // own npcTeamRemainingCount semantics after a turn — here, before any
  // turn has been taken this attempt/session read, it's simply team.length
  // - npcActiveIndex).
  readonly npcTeamRemainingCount: number;
  readonly npc: {
    readonly speciesId: string;
    readonly name: string;
    readonly level: number;
    readonly spriteUrl: string;
    readonly currentHp: number;
    readonly maxHp: number;
    readonly status: MajorStatus | null;
  };
  readonly player: {
    readonly id: string;
    readonly name: string;
    readonly level: number;
    readonly spriteUrl: string;
    readonly fallbackSpriteUrl: string;
    readonly currentHp: number;
    readonly maxHp: number;
    readonly status: MajorStatus | null;
  };
  readonly participants: readonly GymBattleParticipantView[];
  readonly knownMoves: readonly BattleKnownMoveSlot[];
  readonly playerName: string;
}

export type GymBattleViewResult = { status: "ready"; data: GymBattleViewData } | { status: "no-session" } | { status: "corrupt-session" };

function contextLabelFor(battleSource: string, regionId: string, gymNumber: number | null, battleSlot: string | null): string {
  const region = toRegionId(regionId);
  if (battleSource === "regional-champion") {
    return regionalChampionLabelHe(region);
  }
  const regionName = REGION_DISPLAY_NAMES_HE[region];
  const slotLabel = GYM_BATTLE_SLOT_LABELS_HE[(battleSlot ?? "easy") as GymBattleSlotId];
  return `מכון ${regionName} ${gymNumber} — ${slotLabel}`;
}

export async function getGymBattleViewData(playerId: string, playerName: string): Promise<GymBattleViewResult> {
  const session = await getNpcBattleSession(playerId);
  if (!session) return { status: "no-session" };

  const npcTeam = parseNpcTeam(session.npcTeam);
  const activeNpc = npcTeam[session.npcActiveIndex];
  const npcSpecies = activeNpc ? getSpeciesById(activeNpc.speciesId) : undefined;
  if (!activeNpc || !npcSpecies) return { status: "corrupt-session" };

  const participants = await getParticipatingParty(playerId, session);
  const activePokemon = participants.find((pokemon) => pokemon.id === session.activePlayerPokemonId);
  if (!activePokemon) return { status: "corrupt-session" };

  const playerBattleHp = parseNpcBattleHpMap(session.playerBattleHp);
  const playerStatusMap = parseNpcBattleStatusMap(session.playerBattleStatus);
  const npcMaxHp = calculatePokemonStats({ baseStats: npcSpecies.baseStats, level: activeNpc.level }).maxHp;

  const knownMoves = await resolveKnownMoveSlots(activePokemon.id);

  return {
    status: "ready",
    data: {
      battleSource: session.battleSource as "gym" | "regional-champion",
      regionId: toRegionId(session.regionId),
      gymNumber: session.gymNumber as 1 | 2 | 3 | null,
      contextLabel: contextLabelFor(session.battleSource, session.regionId, session.gymNumber, session.battleSlot),
      npcTeamTotalCount: npcTeam.length,
      npcTeamRemainingCount: npcTeam.length - session.npcActiveIndex,
      npc: {
        speciesId: npcSpecies.id,
        name: npcSpecies.name,
        level: activeNpc.level,
        spriteUrl: getFrontSpritePath(npcSpecies),
        currentHp: session.npcCurrentHp,
        maxHp: npcMaxHp,
        status: (session.npcStatus as MajorStatus | null) ?? null,
      },
      player: {
        id: activePokemon.id,
        name: activePokemon.nickname ?? activePokemon.species.name,
        level: activePokemon.level,
        spriteUrl: getBackSpritePath(activePokemon.species),
        fallbackSpriteUrl: getFrontSpritePath(activePokemon.species),
        currentHp: playerBattleHp[activePokemon.id] ?? 0,
        maxHp: activePokemon.maxHp,
        status: statusFor(playerStatusMap, activePokemon.id).status,
      },
      participants: participants.map((pokemon) => ({
        id: pokemon.id,
        speciesId: pokemon.species.id,
        name: pokemon.nickname ?? pokemon.species.name,
        level: pokemon.level,
        frontSpriteUrl: getFrontSpritePath(pokemon.species),
        currentHp: playerBattleHp[pokemon.id] ?? 0,
        maxHp: pokemon.maxHp,
        fainted: (playerBattleHp[pokemon.id] ?? 0) <= 0,
        isActive: pokemon.id === session.activePlayerPokemonId,
      })),
      knownMoves,
      playerName,
    },
  };
}
