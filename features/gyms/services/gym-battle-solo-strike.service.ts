import "server-only";

import { resolveSoloEnemyStrike } from "@/features/battle/services/battle-turn-engine";
import { getStartingKnownMoves } from "@/engine/known-moves";
import { getUsableMoveIds } from "@/features/battle/volatile/move-legality";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import type { NpcBattleSession, Prisma } from "@/lib/generated/prisma/client";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import { GYM_BATTLE_SLOT_DIFFICULTY, REGIONAL_CHAMPION_DIFFICULTY } from "../data/gym-registry";
import { selectNpcMoveForDifficulty } from "./gym-npc-ai";
import { parseNpcBattleHpMap, parseNpcBattleStatusMap, parseNpcBattleVolatileState, parseNpcTeam, syncParticipantToRealPokemon, type NpcBattleParticipantStatus } from "./gym-battle-session.service";
import type { GymBattleSlotId, GymDifficulty } from "../types/gym.types";

// GYM BATTLE UX — SHARED "NPC FREE STRIKE" RESOLUTION (later task, sections
// 4/5). Both a voluntary switch and a Bag item use consume the player's
// turn, so the NPC opponent gets one free strike against the player's
// (possibly just-switched-in) active Pokémon — this is the ONE place that
// consequence is resolved, reused by both callers rather than duplicated.
// Never touches the NPC's own HP (a free strike is one-directional); never
// re-implements the normal two-sided turn (that stays
// gym-battle-action.service.ts's own executeGymBattleAction, unmodified).

export interface FreeStrikeOutcome {
  readonly updatedDefenderHp: number;
  readonly defenderFainted: boolean;
  readonly battleEnded: boolean;
  readonly winner: "player" | "npc" | null;
  // ATTACK SOUND (later task, section 3) — true exactly when the NPC
  // actually resolved an attack this call (a real move-used attempt,
  // hit or miss); false in the defensive "no NPC team left to strike with"
  // early-return branch below, where nothing was resolved at all. Callers
  // (voluntary switch / Bag item use) use this to decide whether to play
  // the attack sound for the NPC's response — never faking a sound for an
  // attack that didn't happen.
  readonly attacked: boolean;
}

function difficultyForSession(session: NpcBattleSession): GymDifficulty {
  if (session.battleSource === "regional-champion") return REGIONAL_CHAMPION_DIFFICULTY;
  return GYM_BATTLE_SLOT_DIFFICULTY[session.battleSlot as GymBattleSlotId];
}

// Applies the NPC's own free strike against `defender` (the player's
// current active participant AFTER whatever switch/item change already
// happened), persists the result to BOTH the session's own battle-local
// state and (HP persistence, section 9) the real PlayerPokemon row, and
// reports whether this ended the battle. Always runs inside the caller's
// own transaction — a switch/item change and this free strike are one
// atomic step, never two separate writes a refresh could split.
export async function applyNpcFreeStrike(
  tx: Prisma.TransactionClient,
  session: NpcBattleSession,
  defender: OwnedPokemon,
  randomSource?: () => number
): Promise<FreeStrikeOutcome> {
  const npcTeam = parseNpcTeam(session.npcTeam);
  const activeNpc = npcTeam[session.npcActiveIndex];
  const npcSpecies = activeNpc ? getSpeciesById(activeNpc.speciesId) : undefined;

  const playerBattleHp = parseNpcBattleHpMap(session.playerBattleHp);
  const currentDefenderHp = playerBattleHp[defender.id] ?? defender.currentHp;

  // A defeated/corrupt NPC team can't strike — nothing to resolve (should
  // not normally happen; defensive only).
  if (!activeNpc || !npcSpecies || session.npcCurrentHp <= 0) {
    return { updatedDefenderHp: currentDefenderHp, defenderFainted: currentDefenderHp <= 0, battleEnded: false, winner: null, attacked: false };
  }

  const difficulty = difficultyForSession(session);
  const npcKnownMoveIds = getStartingKnownMoves(npcSpecies.id, activeNpc.level);
  const npcVolatile = parseNpcBattleVolatileState(session.npcVolatileState);
  const usableNpcMoveIds = getUsableMoveIds(npcKnownMoveIds, npcVolatile);
  const enemyMoveId = selectNpcMoveForDifficulty(usableNpcMoveIds, difficulty, randomSource);

  const strike = resolveSoloEnemyStrike(
    {
      pokemonId: npcSpecies.id,
      baseStats: npcSpecies.baseStats,
      level: activeNpc.level,
      types: npcSpecies.types,
      stages: {},
      status: (session.npcStatus as never) ?? null,
      statusTurnsRemaining: session.npcStatusTurnsRemaining,
      volatile: npcVolatile,
      currentHp: session.npcCurrentHp,
      knownMoveIds: npcKnownMoveIds,
      moveId: enemyMoveId,
    },
    {
      pokemonId: defender.id,
      baseStats: defender.species.baseStats,
      level: defender.level,
      types: defender.species.types,
      status: null,
      currentHp: currentDefenderHp,
    },
    randomSource
  );

  const nextPlayerBattleHp = { ...playerBattleHp, [defender.id]: strike.updatedDefenderHp };
  const playerStatusMap = parseNpcBattleStatusMap(session.playerBattleStatus);
  const nextStatusMap: Record<string, NpcBattleParticipantStatus> = {
    ...playerStatusMap,
    [defender.id]: { status: strike.appliedStatus, turnsRemaining: strike.appliedStatusTurnsRemaining },
  };

  const anyOtherUsable = Object.entries(nextPlayerBattleHp).some(([id, hp]) => id !== defender.id && hp > 0);
  const playerHasNoUsableLeft = strike.defenderFainted && !anyOtherUsable;
  const battleEnded = playerHasNoUsableLeft;
  const winner: "player" | "npc" | null = playerHasNoUsableLeft ? "npc" : null;

  await syncParticipantToRealPokemon(tx, defender.id, {
    currentHp: strike.updatedDefenderHp,
    status: strike.appliedStatus,
    statusTurnsRemaining: strike.appliedStatusTurnsRemaining,
  });

  if (battleEnded) {
    await tx.npcBattleSession.deleteMany({ where: { playerId: session.playerId } });
  } else {
    await tx.npcBattleSession.updateMany({
      where: { playerId: session.playerId },
      data: {
        playerBattleHp: nextPlayerBattleHp as unknown as Prisma.InputJsonValue,
        playerBattleStatus: nextStatusMap as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return { updatedDefenderHp: strike.updatedDefenderHp, defenderFainted: strike.defenderFainted, battleEnded, winner, attacked: true };
}
