import "server-only";

import { prisma } from "@/lib/db/prisma";
import { applyNpcFreeStrike } from "./gym-battle-solo-strike.service";
import {
  getNpcBattleSession,
  getParticipatingParty,
  guardedSessionUpdate,
  isActiveParticipantFainted,
  parseNpcBattleHpMap,
  StaleNpcBattleSessionError,
} from "./gym-battle-session.service";

// VOLUNTARY POKÉMON SWITCHING (later task, section 5) — distinct from
// switchNpcBattleActivePokemon (gym-battle-session.service.ts), which stays
// the FREE forced-replacement path, completely unmodified. This one is the
// player choosing to switch on their own normal turn: the target must be a
// living, battle-selected participant other than the current active one,
// and — unlike forced replacement — this consumes the turn, so the NPC
// opponent gets one free strike against the newly-active Pokémon (see
// gym-battle-solo-strike.service.ts, shared with Bag item use).

export type VoluntarySwitchResult =
  | {
      status: "success";
      updatedDefenderHp: number;
      battleEnded: boolean;
      winner: "player" | "npc" | null;
      victoryCompleted: boolean;
      // ATTACK SOUND (later task, section 3) — true exactly when the NPC's
      // free-strike response actually resolved an attack (see
      // FreeStrikeOutcome.attacked's own doc comment) — the client plays
      // the shared attack sound for the NPC's response only when this is
      // true, never for the switch itself.
      npcAttacked: boolean;
    }
  | { status: "no-session" }
  | { status: "not-owned" }
  | { status: "already-active" }
  | { status: "fainted" }
  // BAG / VOLUNTARY SWITCH — PLAYER TURN ONLY (GYM BATTLE POLISH task,
  // section 2) — the currently-active participant has already fainted;
  // only the separate, free forced-replacement flow
  // (switchNpcBattleActivePokemon) is valid right now, never this
  // turn-consuming voluntary switch.
  | { status: "forced-replacement-pending" }
  // TURN SAFETY / RACE GUARD (same task) — this switch's free-strike
  // outcome was computed off a session snapshot another action already
  // mutated since; nothing was written.
  | { status: "stale-action" };

export async function voluntarySwitchNpcBattleActivePokemon(
  playerId: string,
  targetPlayerPokemonId: string,
  randomSource?: () => number
): Promise<VoluntarySwitchResult> {
  const session = await getNpcBattleSession(playerId);
  if (!session) return { status: "no-session" };
  if (isActiveParticipantFainted(session)) return { status: "forced-replacement-pending" };

  if (targetPlayerPokemonId === session.activePlayerPokemonId) {
    return { status: "already-active" };
  }

  const participants = await getParticipatingParty(playerId, session);
  const target = participants.find((pokemon) => pokemon.id === targetPlayerPokemonId);
  if (!target) return { status: "not-owned" };

  const playerBattleHp = parseNpcBattleHpMap(session.playerBattleHp);
  const targetHp = playerBattleHp[target.id] ?? target.currentHp;
  if (targetHp <= 0) return { status: "fainted" };

  try {
    return await prisma.$transaction(async (tx) => {
      // Switch itself — reuses the exact same "new active Pokémon, reset its
      // own stat stages/volatile" write forced replacement already does, via
      // a direct guarded write here rather than calling
      // switchNpcBattleActivePokemon a second time (that function re-reads
      // the session itself; inside this same transaction we already have
      // it). Guarded by `session.updatedAt`, read before this transaction
      // started — see gym-battle-session.service.ts's own doc comment.
      await guardedSessionUpdate(tx, playerId, session.updatedAt, {
        activePlayerPokemonId: target.id,
        playerStatStages: {},
        playerVolatileState: {},
      });

      // The free strike is the SECOND write of this same, already-guarded
      // transaction — never re-guarded against the now-stale original
      // `session.updatedAt`.
      const outcome = await applyNpcFreeStrike(tx, session, target, randomSource);

      return {
        status: "success",
        updatedDefenderHp: outcome.updatedDefenderHp,
        battleEnded: outcome.battleEnded,
        winner: outcome.winner,
        victoryCompleted: false,
        npcAttacked: outcome.attacked,
      };
    });
  } catch (error) {
    if (error instanceof StaleNpcBattleSessionError) return { status: "stale-action" };
    throw error;
  }
}
