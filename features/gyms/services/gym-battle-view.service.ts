import "server-only";

import { calculatePokemonStats } from "@/engine/battle/pokemon-stat-calculations";
import type { MajorStatus } from "@/features/battle/status/major-status";
import { getBackSpritePath, getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { resolveKnownMoveSlots, type BattleKnownMoveSlot } from "@/features/battle/services/battle-view.service";
import { GYM_BATTLE_SLOT_LABELS_HE, REGION_DISPLAY_NAMES_HE, regionalChampionLabelHe } from "../data/gym-labels";
import { getGymTrainerName, getRegionalChampionTrainerName } from "../data/gym-trainer-names";
import { toRegionId, type RegionId } from "@/shared/types/region";
import type { PokemonType } from "@/shared/types/pokemon";
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
  // COMPLETE STATUS-MEDICINE BATTLE SUPPORT — the participant's LIVE
  // in-battle status (session.playerBattleStatus via statusFor, never the
  // possibly-stale PlayerPokemon.status row — same reasoning
  // gym-battle-item.service.ts's own doc comment gives). Lets the Bag's
  // target picker (GymBagPanel.tsx) both filter eligible targets for a
  // cure-status item and show WHY a given participant is eligible.
  readonly status: MajorStatus | null;
}

export interface GymBattleViewData {
  readonly battleSource: "gym" | "regional-champion";
  readonly regionId: RegionId;
  readonly gymNumber: 1 | 2 | 3 | null;
  readonly contextLabel: string;
  // FIXED TRAINER NAMES (later task, section 2) — the actual opponent's
  // name, read from data (gym-trainer-names.ts), never invented inline in
  // the UI. Difficulty/role (Easy/Medium/Leader/Champion) stays available
  // separately via contextLabel above — this is the NAME, not a role label.
  readonly trainerName: string;
  readonly npcTeamTotalCount: number;
  // Includes the currently-active NPC (matches gym-battle-action.service's
  // own npcTeamRemainingCount semantics after a turn — here, before any
  // turn has been taken this attempt/session read, it's simply team.length
  // - npcActiveIndex).
  readonly npcTeamRemainingCount: number;
  // POKÉ BALL TEAM STATUS INDICATORS (later task, section 3) — one entry
  // per NPC team member, in team order, true while still alive (not yet
  // defeated). Derived purely from npcActiveIndex (every index before it is
  // already defeated) plus the currently-active one's own real HP — no
  // separate "lives" counter, never out of sync with the actual battle
  // state.
  readonly npcTeamAliveFlags: readonly boolean[];
  // Same idea for the player's own selected participants, in the exact
  // order they were selected at battle start — true while currentHp > 0 in
  // the live battle-local HP map (which, after the HP persistence change,
  // IS the real HP now).
  readonly playerTeamAliveFlags: readonly boolean[];
  readonly npc: {
    readonly speciesId: string;
    readonly name: string;
    readonly level: number;
    readonly spriteUrl: string;
    readonly currentHp: number;
    readonly maxHp: number;
    readonly status: MajorStatus | null;
    // BATTLE UI — TYPE DISPLAY. This species' own canonical types, in data
    // order — see components/battle/BattleHUD.tsx's own doc comment.
    readonly types: readonly PokemonType[];
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
    readonly types: readonly PokemonType[];
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

  const regionId = toRegionId(session.regionId);
  const trainerName =
    session.battleSource === "regional-champion"
      ? getRegionalChampionTrainerName(regionId)
      : getGymTrainerName(regionId, session.gymNumber as 1 | 2 | 3, session.battleSlot as GymBattleSlotId);

  const npcTeamAliveFlags = npcTeam.map((_, index) =>
    index < session.npcActiveIndex ? false : index === session.npcActiveIndex ? session.npcCurrentHp > 0 : true
  );
  const playerTeamAliveFlags = participants.map((pokemon) => (playerBattleHp[pokemon.id] ?? 0) > 0);

  return {
    status: "ready",
    data: {
      battleSource: session.battleSource as "gym" | "regional-champion",
      regionId,
      gymNumber: session.gymNumber as 1 | 2 | 3 | null,
      contextLabel: contextLabelFor(session.battleSource, session.regionId, session.gymNumber, session.battleSlot),
      trainerName,
      npcTeamTotalCount: npcTeam.length,
      npcTeamRemainingCount: npcTeam.length - session.npcActiveIndex,
      npcTeamAliveFlags,
      playerTeamAliveFlags,
      npc: {
        speciesId: npcSpecies.id,
        name: npcSpecies.name,
        level: activeNpc.level,
        spriteUrl: getFrontSpritePath(npcSpecies),
        currentHp: session.npcCurrentHp,
        maxHp: npcMaxHp,
        status: (session.npcStatus as MajorStatus | null) ?? null,
        types: npcSpecies.types,
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
        types: activePokemon.species.types,
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
        status: statusFor(playerStatusMap, pokemon.id).status,
      })),
      knownMoves,
      playerName,
    },
  };
}
