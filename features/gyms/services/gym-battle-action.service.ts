import "server-only";

import { calculatePokemonStats } from "@/engine/battle/pokemon-stat-calculations";
import { getStartingKnownMoves } from "@/engine/known-moves";
import { getMoveById } from "@/engine/moves";
import type { BattleEvent } from "@/features/battle/events/battle-event.types";
import { resolveBattleTurn, summarizeVolatile, type BattleVolatileSummary } from "@/features/battle/services/battle-turn-engine";
import type { MajorStatus } from "@/features/battle/status/major-status";
import { getUsableMoveIds } from "@/features/battle/volatile/move-legality";
import type { VolatileState } from "@/features/battle/volatile/volatile-condition.types";
import { getKnownMoveIds } from "@/features/known-moves/known-moves-queries";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { prisma } from "@/lib/db/prisma";
import type { NpcBattleSession, Prisma } from "@/lib/generated/prisma/client";
import { GYM_BATTLE_SLOT_DIFFICULTY, REGIONAL_CHAMPION_DIFFICULTY } from "../data/gym-registry";
import {
  getNpcBattleSession,
  getParticipatingParty,
  parseNpcBattleHpMap,
  parseNpcBattleStatStages,
  parseNpcBattleStatusMap,
  parseNpcBattleVolatileState,
  parseNpcTeam,
  statusFor,
  type NpcBattleParticipantStatus,
} from "./gym-battle-session.service";
import { selectNpcMoveForDifficulty } from "./gym-npc-ai";
import { markGymBattleCompleted, markRegionalChampionDefeated } from "./gym-progression.service";
import { grantGymLeaderReward, grantRegionalChampionReward, type GrantedGymReward } from "./gym-reward.service";
import type { GymBattleSlotId, GymDifficulty } from "../types/gym.types";
import { toRegionId } from "@/shared/types/region";

// GYMS & LEAGUES PHASE 3 — turn-by-turn combat resolution for an
// in-progress NPC battle. Reuses the exact same shared engine
// (resolveBattleTurn) Field Battle uses — see that function's own doc
// comment. This file's own job is entirely about HOW an NPC battle is
// different from a wild encounter: a fixed multi-Pokémon roster fought
// sequentially, battle-local player HP/status (never PlayerPokemon.
// currentHp/.status), difficulty-aware NPC move selection, and completion
// (Badge/Medal) marked exactly once on a clean final victory — never any
// XP/currency/Egg/Chest reward of any kind (Field Battle isolation).

export interface GymBattleActionSuccess {
  readonly status: "success";
  readonly moveId: string;
  readonly enemyMoveId: string;
  readonly playerDamage: number;
  readonly enemyDamage: number;
  readonly updatedPlayerHp: number;
  readonly updatedNpcHp: number;
  readonly playerStatus: MajorStatus | null;
  readonly npcStatus: MajorStatus | null;
  readonly playerVolatile: BattleVolatileSummary;
  readonly npcVolatile: BattleVolatileSummary;
  // This specific NPC Pokémon fainted this turn — may or may not end the
  // whole battle (see npcTeamRemainingCount/battleEnded).
  readonly npcFainted: boolean;
  readonly partyPokemonFainted: boolean;
  // How many NPC Pokémon (including the currently-active one, if it
  // didn't just faint) are left after this turn — 0 exactly when the
  // whole NPC team has been defeated.
  readonly npcTeamRemainingCount: number;
  readonly battleEnded: boolean;
  readonly winner: "player" | "npc" | null;
  // True exactly when THIS action is what completed the battle with the
  // player winning — the one moment markGymBattleCompleted/
  // markRegionalChampionDefeated ever runs (see section 11's own
  // "exactly once" rule).
  readonly victoryCompleted: boolean;
  // GYMS & LEAGUES PHASE 4 — set exactly when victoryCompleted is true AND
  // this was the FIRST time this Gym Leader/Regional Champion battle was
  // ever completed (markGymBattleCompleted/markRegionalChampionDefeated's
  // own firstCompletion/firstDefeat signal — see gym-progression.service.ts).
  // Undefined for every other action, for an Easy/Medium victory (no reward
  // exists for those — section 12), and for a duplicate/racing victory
  // request against an already-rewarded completion — reward granting is
  // therefore exactly-once even under a retry/race, never re-derived from
  // "battleEnded && winner === player" alone.
  readonly reward?: GrantedGymReward;
  readonly events: BattleEvent[];
}

export type GymBattleActionResult =
  | GymBattleActionSuccess
  | { status: "no-session" }
  | { status: "not-owned" }
  | { status: "invalid-active-pokemon" }
  | { status: "invalid-move"; moveId: string };

function difficultyForSession(session: NpcBattleSession): GymDifficulty {
  if (session.battleSource === "regional-champion") return REGIONAL_CHAMPION_DIFFICULTY;
  return GYM_BATTLE_SLOT_DIFFICULTY[session.battleSlot as GymBattleSlotId];
}

// The single server-side entry point for resolving one player attack (plus
// the active NPC's own counter-attack, and NPC-team advancement) inside an
// in-progress Gym/Regional-Champion battle. Every validation below is
// defense-in-depth against a client that cannot be trusted — same
// discipline executeBattleAction (Field Battle) already follows.
export async function executeGymBattleAction(playerId: string, moveId: string, randomSource?: () => number): Promise<GymBattleActionResult> {
  const session = await getNpcBattleSession(playerId);
  if (!session) return { status: "no-session" };

  const participants = await getParticipatingParty(playerId, session);
  const activePokemon = participants.find((pokemon) => pokemon.id === session.activePlayerPokemonId);
  if (!activePokemon) return { status: "not-owned" };

  const playerBattleHp = parseNpcBattleHpMap(session.playerBattleHp);
  const currentPlayerHp = playerBattleHp[activePokemon.id] ?? 0;
  if (currentPlayerHp <= 0) {
    // A fainted active Pokémon cannot attack — a forced replacement
    // (switchNpcBattleActivePokemon) must happen first, same rule Field
    // Battle already enforces for its own active Pokémon.
    return { status: "invalid-active-pokemon" };
  }

  const move = getMoveById(moveId);
  if (!move) return { status: "invalid-move", moveId };

  const knownMoveIds = await getKnownMoveIds(activePokemon.id);
  if (!knownMoveIds.includes(moveId)) return { status: "invalid-move", moveId };

  const playerStatusMap = parseNpcBattleStatusMap(session.playerBattleStatus);
  const activePlayerStatus = statusFor(playerStatusMap, activePokemon.id);
  const playerStages = parseNpcBattleStatStages(session.playerStatStages);
  const playerVolatile = parseNpcBattleVolatileState(session.playerVolatileState);

  if (!getUsableMoveIds(knownMoveIds, playerVolatile).includes(moveId)) {
    return { status: "invalid-move", moveId };
  }

  const npcTeam = parseNpcTeam(session.npcTeam);
  const activeNpc = npcTeam[session.npcActiveIndex];
  const npcSpecies = activeNpc ? getSpeciesById(activeNpc.speciesId) : undefined;
  if (!activeNpc || !npcSpecies) {
    // Corrupt/stale row — treat as no session rather than crash. Should
    // never happen: npcTeam is frozen at start and npcActiveIndex only
    // ever advances within its bounds (see the victory branch below).
    return { status: "no-session" };
  }

  const difficulty = difficultyForSession(session);
  const npcKnownMoveIds = getStartingKnownMoves(npcSpecies.id, activeNpc.level);
  const npcStatus = (session.npcStatus as MajorStatus | null) ?? null;
  const npcStages = parseNpcBattleStatStages(session.npcStatStages);
  const npcVolatile = parseNpcBattleVolatileState(session.npcVolatileState);
  const usableNpcMoveIds = getUsableMoveIds(npcKnownMoveIds, npcVolatile);
  const enemyMoveId = selectNpcMoveForDifficulty(usableNpcMoveIds, difficulty, randomSource);

  const turnResult = resolveBattleTurn(
    {
      pokemonId: activePokemon.id,
      baseStats: activePokemon.species.baseStats,
      level: activePokemon.level,
      types: activePokemon.species.types,
      stages: playerStages,
      status: activePlayerStatus.status,
      statusTurnsRemaining: activePlayerStatus.turnsRemaining,
      volatile: playerVolatile,
      currentHp: currentPlayerHp,
      knownMoveIds,
      moveId,
    },
    {
      pokemonId: npcSpecies.id,
      baseStats: npcSpecies.baseStats,
      level: activeNpc.level,
      types: npcSpecies.types,
      stages: npcStages,
      status: npcStatus,
      statusTurnsRemaining: session.npcStatusTurnsRemaining,
      volatile: npcVolatile,
      currentHp: session.npcCurrentHp,
      knownMoveIds: npcKnownMoveIds,
      moveId: enemyMoveId,
    },
    randomSource
  );

  const nextPlayerBattleHp = { ...playerBattleHp, [activePokemon.id]: turnResult.player.updatedHp };
  const nextPlayerStatusMap: Record<string, NpcBattleParticipantStatus> = {
    ...playerStatusMap,
    [activePokemon.id]: { status: turnResult.player.status, turnsRemaining: turnResult.player.statusTurnsRemaining },
  };

  // NPC TEAM PROGRESSION — the active NPC fainted: advance to the next one
  // (fresh full HP, no carried-over status/stages/volatile — a new
  // Pokémon), or, if that was the last one, the whole NPC team is defeated.
  let nextNpcActiveIndex = session.npcActiveIndex;
  let nextNpcCurrentHp = turnResult.enemy.updatedHp;
  let nextNpcStatus: MajorStatus | null = turnResult.enemy.status;
  let nextNpcStatusTurnsRemaining = turnResult.enemy.statusTurnsRemaining;
  let nextNpcStages: Prisma.InputJsonValue = turnResult.enemy.stages as unknown as Prisma.InputJsonValue;
  let nextNpcVolatile: VolatileState = turnResult.enemy.volatile;

  if (turnResult.enemy.fainted) {
    nextNpcActiveIndex = session.npcActiveIndex + 1;
    const nextNpc = npcTeam[nextNpcActiveIndex];
    if (nextNpc) {
      const nextNpcSpecies = getSpeciesById(nextNpc.speciesId);
      nextNpcCurrentHp = nextNpcSpecies ? calculatePokemonStats({ baseStats: nextNpcSpecies.baseStats, level: nextNpc.level }).maxHp : 0;
      nextNpcStatus = null;
      nextNpcStatusTurnsRemaining = null;
      nextNpcStages = {};
      nextNpcVolatile = {};
    }
  }

  const npcTeamRemainingCount = Math.max(0, npcTeam.length - nextNpcActiveIndex);

  // Player side: still-usable participants OTHER than whoever is active
  // now (the one that may have just fainted) — mirrors party-rules.ts's
  // own hasUsableMember concept, evaluated over this attempt's own
  // battle-local HP map, never the real party.
  const anyOtherPlayerPokemonUsable = Object.entries(nextPlayerBattleHp).some(([id, hp]) => id !== activePokemon.id && hp > 0);
  const playerHasNoUsableLeft = turnResult.player.fainted && !anyOtherPlayerPokemonUsable;

  const npcTeamFullyDefeated = npcTeamRemainingCount === 0;
  // Same explicit priority Field Battle's own winner logic documents: the
  // player having nothing left to send out takes priority over the NPC
  // team also having just been fully defeated in the very same action (a
  // mutual-knockout-on-the-last-exchange edge case) — the player already
  // lost, even though their last hit also finished the NPC team.
  const battleEnded = playerHasNoUsableLeft || npcTeamFullyDefeated;
  const winner: "player" | "npc" | null = playerHasNoUsableLeft ? "npc" : npcTeamFullyDefeated ? "player" : null;
  const victoryCompleted = winner === "player";

  let reward: GrantedGymReward | undefined;

  if (victoryCompleted) {
    // WIN COMPLETION (section 11) + REWARD GRANTING (Phase 4, section 17) —
    // completion marking, reward granting, and deleting the now-finished
    // session all happen inside the SAME transaction, so a crash/race can
    // never leave completion recorded without its reward (or vice versa).
    // markGymBattleCompleted/markRegionalChampionDefeated's own return
    // value (firstCompletion/firstDefeat) is the exactly-once gate: a
    // racing/retried duplicate victory request for an already-completed
    // battle grants nothing a second time, protected at the DB unique-
    // constraint level (see gym-progression.service.ts), never solely by
    // "the battle can't be replayed" at the session layer above.
    const regionId = toRegionId(session.regionId);
    reward = await prisma.$transaction(async (tx) => {
      let grantedReward: GrantedGymReward | undefined;

      if (session.battleSource === "regional-champion") {
        const firstDefeat = await markRegionalChampionDefeated(tx, playerId, regionId);
        if (firstDefeat) {
          grantedReward = await grantRegionalChampionReward(tx, playerId, regionId);
        }
      } else {
        const gymNumber = session.gymNumber as 1 | 2 | 3;
        const battleSlot = session.battleSlot as GymBattleSlotId;
        const firstCompletion = await markGymBattleCompleted(tx, playerId, regionId, gymNumber, battleSlot);
        // GYM REWARD RULE (section 12) — Easy/Medium have no numeric reward;
        // only a Gym Leader victory ever grants one.
        if (firstCompletion && battleSlot === "leader") {
          grantedReward = await grantGymLeaderReward(tx, playerId, regionId, gymNumber);
        }
      }

      await tx.npcBattleSession.deleteMany({ where: { playerId } });
      return grantedReward;
    });
  } else if (winner === "npc") {
    // LOSS (section 12) — no penalty, no completion row, no progression
    // reset. The session is simply removed; a fresh startNpcBattle call
    // for the same target starts over (Easy/Medium/Leader already
    // completed earlier stay completed — that's Phase 1's own permanent
    // completion state, untouched by this).
    await prisma.npcBattleSession.deleteMany({ where: { playerId } });
  } else {
    // Battle continues — persist the new battle-local state. Stat stages/
    // volatile for the player side are only ever the ACTIVE Pokémon's own
    // (reset on switch, exactly like Field Battle) — never mutated here
    // for a fainted Pokémon awaiting replacement.
    await prisma.npcBattleSession.updateMany({
      where: { playerId },
      data: {
        npcActiveIndex: nextNpcActiveIndex,
        npcCurrentHp: nextNpcCurrentHp,
        npcStatus: nextNpcStatus,
        npcStatusTurnsRemaining: nextNpcStatusTurnsRemaining,
        npcStatStages: nextNpcStages,
        npcVolatileState: nextNpcVolatile as unknown as Prisma.InputJsonValue,
        playerBattleHp: nextPlayerBattleHp as unknown as Prisma.InputJsonValue,
        playerBattleStatus: nextPlayerStatusMap as unknown as Prisma.InputJsonValue,
        playerStatStages: turnResult.player.stages as unknown as Prisma.InputJsonValue,
        playerVolatileState: turnResult.player.volatile as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return {
    status: "success",
    moveId,
    enemyMoveId,
    playerDamage: turnResult.player.damageDealt,
    enemyDamage: turnResult.enemy.damageDealt,
    updatedPlayerHp: turnResult.player.updatedHp,
    updatedNpcHp: turnResult.enemy.updatedHp,
    playerStatus: turnResult.player.status,
    npcStatus: turnResult.enemy.status,
    playerVolatile: summarizeVolatile(turnResult.player.volatile),
    npcVolatile: summarizeVolatile(turnResult.enemy.volatile),
    npcFainted: turnResult.enemy.fainted,
    partyPokemonFainted: turnResult.player.fainted,
    npcTeamRemainingCount,
    battleEnded,
    winner,
    victoryCompleted,
    reward,
    events: turnResult.events,
  };
}
