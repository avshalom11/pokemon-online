import "server-only";

import { applyFixedAttack } from "@/engine/battle/battle-config";
import { rollDamageRandomFactor } from "@/engine/damage";
import { getMoveById } from "@/engine/moves";
import {
  endBattleSession,
  markParticipantFainted,
  syncWildHp,
  type BattleVictoryReward,
} from "@/features/battle-session/services/battle-session.service";
import { resolveAttackDamage } from "@/features/battle/utils/battle-damage-rules";
import { getKnownMoveIds } from "@/features/known-moves/known-moves-queries";
import { getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { isPartyDefeated } from "@/features/party/utils/party-rules";
import { prisma } from "@/lib/db/prisma";
import type { ZoneId } from "@/shared/types/zone";

// Phase 4F: Battle Action Pipeline. This is now the ONLY place a player's
// battle action is resolved — React (BattleContent) no longer computes
// damage or HP itself, it only calls executeBattleActionAction (the Server
// Action wrapping this) and renders whatever comes back. See this file's
// own comments below for exactly what moved and what deliberately didn't.
//
// Phase 5A: "attack" now always carries a moveId — the player's actual
// selected Known Move — instead of the old generic, moveId-less attack.
//
// Phase 5B.2: the player's own damage is now the real Phase 5B.1 Damage
// Engine result (move power/category + calculated Attack-or-Special-Attack
// vs. Defense-or-Special-Defense + a random 0.85-1.00 factor) — see
// resolveAttackDamage (battle-damage-rules.ts) below.
//
// Phase 5C: STAB (Same Type Attack Bonus) is now included in that same
// Damage Engine result — the active Pokémon's own species types are passed
// through to resolveAttackDamage below, and the 1.5x multiplier (if it
// applies) is entirely computed inside the Engine, never here.
//
// Phase 5D: Type Effectiveness is now included too — the wild's own
// species types are also passed through to resolveAttackDamage below, and
// the resulting 0x/0.25x/0.5x/1x/2x/4x multiplier is likewise entirely
// computed inside the Engine (engine/damage/type-chart.ts), never here.
// Accuracy, crits, and abilities (Adaptability etc.) are still explicitly
// out of scope. The wild's one counter-attack is deliberately UNCHANGED:
// it still reuses applyFixedAttack
// (engine/battle/battle-config.ts) exactly as before, since enemy move
// selection is a separate, not-yet-implemented system. The old, parallel
// move-based engine (engine/battle/battle-engine.ts and its siblings) is
// deliberately NOT touched or wired in by this phase either.
export type BattleActionType = "attack";

export interface BattleActionSuccess {
  status: "success";
  actionType: BattleActionType;
  moveId: string;

  // Damage dealt this action, in each direction. enemyDamage is 0 when the
  // wild fainted from the player's hit — a fainted wild never counters.
  playerDamage: number;
  enemyDamage: number;

  updatedWildHp: number;
  updatedPartyHp: number;

  wildFainted: boolean;
  partyPokemonFainted: boolean;

  // battleEnded is only ever true when the player's *whole* party has no
  // usable member left (a single fainted Pokémon just means a forced
  // replacement is next — the encounter/session continues). A defeated
  // wild does not end the battle either: the session advances to the next
  // encounter in the same zone, exactly as it already does today.
  battleEnded: boolean;
  winner: "player" | "wild" | null;

  // Reuses BattleVictoryReward exactly as-is (battle-session.service.ts) —
  // null whenever this action didn't newly defeat the wild.
  experienceGranted: BattleVictoryReward | null;
}

export type BattleActionResult =
  | BattleActionSuccess
  | { status: "no-session" }
  | { status: "battle-inactive" }
  | { status: "not-owned" }
  | { status: "invalid-active-pokemon" }
  | { status: "invalid-action" }
  // Covers both "not a real Move Registry entry" and "a real move, but not
  // one this Pokémon actually knows" — see the two checks below. One flat
  // status, same convention every other feature in this project uses
  // rather than a separate variant per specific reason.
  | { status: "invalid-move"; moveId: string };

// The single server-side entry point for executing a player's battle
// action. Every validation below is a defense-in-depth check against a
// client that cannot be trusted, independent of whatever the UI's own
// phase guard already prevents client-side.
export async function executeBattleAction(
  playerId: string,
  zoneId: ZoneId,
  actionType: BattleActionType,
  moveId: string,
  // Test-only seam: production callers (battle-action.action.ts) never pass
  // this, so rollDamageRandomFactor falls back to its own Math.random
  // default. Passing a fixed function here is how tests get a deterministic
  // damage roll without stubbing Math.random globally (see Phase 5B.1's own
  // design note on engine/damage/random.ts).
  randomSource?: () => number
): Promise<BattleActionResult> {
  if (actionType !== "attack") {
    return { status: "invalid-action" };
  }

  // Validate the battle exists: a session for this exact player and zone,
  // never trusting a client-sent session id (there isn't one — the session
  // is always resolved from the authenticated player alone).
  const session = await prisma.fieldBattleSession.findUnique({ where: { playerId } });
  if (!session || session.zoneId !== zoneId) {
    return { status: "no-session" };
  }

  // Validate the battle is active: a wild already at 0 HP means this
  // encounter has already concluded (advancing to the next one, or ending
  // the session, is a separate flow) — attacking it again is rejected
  // rather than silently no-oped.
  if (session.wildCurrentHp <= 0) {
    return { status: "battle-inactive" };
  }

  // Validate the player + the active Pokémon's ownership together: re-load
  // this player's own party (never a client-supplied party) and confirm
  // the session's activePlayerPokemonId is actually one of their own —
  // same ownership guarantee restoreFromRow already relies on
  // (battle-session.service.ts).
  const party = await getPlayerParty(playerId);
  const activePokemon = party.find((pokemon) => pokemon.id === session.activePlayerPokemonId);

  if (!activePokemon) {
    return { status: "not-owned" };
  }

  // Validate the active Pokémon: a fainted Pokémon cannot attack — a
  // forced replacement must happen first.
  if (activePokemon.currentHp <= 0) {
    return { status: "invalid-active-pokemon" };
  }

  // Validate the move: it must be a real Move Registry entry, AND it must
  // actually be one of this exact Pokémon's Known Moves — a client cannot
  // submit a move belonging to a different one of the player's own
  // Pokémon, let alone a move nobody owns. Two separate checks on purpose
  // (a move could theoretically be known-but-deregistered data corruption,
  // or registry-valid but simply not this Pokémon's) even though in
  // practice Known Moves can never contain a moveId the registry doesn't
  // recognize (engine/known-moves already enforces that at write time).
  const move = getMoveById(moveId);
  if (!move) {
    return { status: "invalid-move", moveId };
  }

  const knownMoveIds = await getKnownMoveIds(activePokemon.id);
  if (!knownMoveIds.includes(moveId)) {
    return { status: "invalid-move", moveId };
  }

  // The wild's species is re-derived from the session row rather than
  // trusted from a client value — same rule every other wild-stat read in
  // this codebase follows (see battle-session.service.ts's syncWildHp). A
  // missing species means a corrupt/stale row; treat it the same as an
  // already-concluded encounter rather than crash or fabricate stats.
  const wildSpecies = getSpeciesById(session.wildSpeciesId);
  if (!wildSpecies) {
    return { status: "battle-inactive" };
  }

  // ---- Damage Engine (Phase 5B.2 integration, Phase 5C STAB, Phase 5D ---
  // ---- Type Effectiveness) ------------------------------------------------
  // Real move power/category, the centralized stat system, a production
  // 0.85-1.00 random roll, STAB (the active Pokémon's own species types vs.
  // the move's own type), and Type Effectiveness (the move's own type vs.
  // the wild's own species types) — replaces the old fixed
  // TEMPORARY_ATTACK_DAMAGE hit for the player's own attack only. A status
  // move correctly resolves to 0 damage via the Engine's own non-damaging
  // result rather than a special case here.
  const damageResult = resolveAttackDamage(
    move,
    { baseStats: activePokemon.species.baseStats, level: activePokemon.level, types: activePokemon.species.types },
    { baseStats: wildSpecies.baseStats, level: session.wildLevel, types: wildSpecies.types },
    rollDamageRandomFactor(randomSource)
  );
  const playerDamage = damageResult.kind === "damage" ? damageResult.damage : 0;
  const updatedWildHp = Math.max(0, session.wildCurrentHp - playerDamage);
  const wildFainted = updatedWildHp <= 0;

  // Persists the wild's new HP and — only the first time it lands at 0 —
  // grants both reward halves atomically. Exactly the same function the
  // old client-driven syncWildHpAction called; completely unchanged.
  const experienceGranted = await syncWildHp(playerId, zoneId, updatedWildHp);

  if (wildFainted) {
    return {
      status: "success",
      actionType: "attack",
      moveId,
      playerDamage,
      enemyDamage: 0,
      updatedWildHp,
      updatedPartyHp: activePokemon.currentHp,
      wildFainted: true,
      partyPokemonFainted: false,
      battleEnded: false,
      winner: "player",
      experienceGranted,
    };
  }

  // The wild survived, so it gets its one counter-attack against the
  // active Pokémon — same applyFixedAttack rule, no attacker id (the
  // one-hit-KO override never applies in this direction).
  const updatedPartyHp = applyFixedAttack(activePokemon.currentHp);
  const enemyDamage = activePokemon.currentHp - updatedPartyHp;
  const partyPokemonFainted = updatedPartyHp <= 0;

  await prisma.playerPokemon.update({
    where: { id: activePokemon.id },
    data: { currentHp: updatedPartyHp },
  });

  let battleEnded = false;

  if (partyPokemonFainted) {
    // Permanently ineligible for this encounter's Pokémon-XP reward from
    // here on — same rule/function sync-party-hp.action.ts already applies
    // for every other HP-changing path.
    await markParticipantFainted(playerId, activePokemon.id);

    const liveParty = party.map((pokemon) =>
      pokemon.id === activePokemon.id ? { ...pokemon, currentHp: updatedPartyHp } : pokemon
    );

    if (isPartyDefeated(liveParty)) {
      battleEnded = true;
      await endBattleSession(playerId);
    }
  }

  return {
    status: "success",
    actionType: "attack",
    moveId,
    playerDamage,
    enemyDamage,
    updatedWildHp,
    updatedPartyHp,
    wildFainted: false,
    partyPokemonFainted,
    battleEnded,
    winner: battleEnded ? "wild" : null,
    experienceGranted,
  };
}
