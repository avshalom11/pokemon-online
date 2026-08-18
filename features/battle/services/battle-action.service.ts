import "server-only";

import { UnknownMoveError } from "@/engine/damage";
import { getStartingKnownMoves } from "@/engine/known-moves";
import { getMoveById } from "@/engine/moves";
import type { EncounterResult } from "@/engine/encounter/pokemon-encounter-engine";
import { selectEnemyMove } from "@/features/battle/ai/select-enemy-move";
import {
  applyWildHpSync,
  endBattleSession,
  getActiveBattleSessionWithParty,
  markParticipantFainted,
  parseStatStages,
  parseVolatileState,
  promoteToNextEncounter,
  serializeStatStages,
  serializeVolatileState,
  type BattleVictoryReward,
} from "@/features/battle-session/services/battle-session.service";
import type { BattleEvent } from "@/features/battle/events/battle-event.types";
import { resolveBattleTurn, summarizeVolatile, type BattleVolatileSummary } from "@/features/battle/services/battle-turn-engine";
import type { MajorStatus } from "@/features/battle/status/major-status";
import { getUsableMoveIds } from "@/features/battle/volatile/move-legality";
import type { VolatileState } from "@/features/battle/volatile/volatile-condition.types";
import { getKnownMoveIds } from "@/features/known-moves/known-moves-queries";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { isPartyDefeated } from "@/features/party/utils/party-rules";
import { getActiveRegionIdByPlayerId } from "@/features/regions/services/region.service";
import { prisma } from "@/lib/db/prisma";
import type { RegionId } from "@/shared/types/region";
import type { ZoneId } from "@/shared/types/zone";

// Phase 4F: Battle Action Pipeline. This is now the ONLY place a player's
// battle action is resolved — React (BattleContent) no longer computes
// damage or HP itself, it only calls executeBattleActionAction (the Server
// Action wrapping this) and renders whatever comes back.
//
// Phase 5A-5H, 6A-6C: real Damage Engine, real enemy Known-Move selection,
// structured Battle Events, Speed/Priority turn order. See git history for
// that narrative — this file's comments now describe the current,
// Phase 6D-6I state: a data-driven Move Effects framework (stat stages,
// major status conditions), layered on top of the exact same turn-order
// and Damage Engine machinery, never a redesign of either.
//
// Phase 6D: move behavior beyond raw damage (stat-stage changes, status
// infliction) comes entirely from the Move Registry's own, pre-existing
// `effect` field (engine/moves/effects) — there is no second, parallel
// "effects" table. features/battle/effects/resolve-move-effects.ts is the
// one generic resolver every move's effect runs through; no move id or
// name ever appears in it or here.
//
// Phase 6E: stat stages (-6..+6) are battle-local only — stored on
// FieldBattleSession (wildStatStages for the wild, playerStatStages for
// whichever Pokémon is currently active), reset on switch
// (syncActivePokemon) and on a new encounter (promoteToNextEncounter).
// Speed stages affect turn order below; Attack/Defense/SpecialAttack/
// SpecialDefense stages are applied inside resolveAttackDamage
// (battle-damage-rules.ts) rather than duplicating the damage formula.
//
// Phase 6F/6G: major status conditions (burn/poison/paralysis/sleep/
// freeze) persist on PlayerPokemon itself for the player's side (exactly
// like currentHp — cleared by the Pokémon Center) and on
// FieldBattleSession for the wild's side (it has no PlayerPokemon row).
// resolvePreActionStatus (features/battle/status) decides, immediately
// before each actor's action, whether it actually gets to attempt its
// move this turn.
//
// Phase 6H: burn/poison residual damage is applied once per turn, after
// both available actions, to whichever side(s) are still active — see
// the end-of-turn section below.
//
// Phase 6J-6L: healing (Recover, ...), drain (Absorb, ...), recoil (Take
// Down, ...), and multi-hit (Double Slap, ...) moves all come from the
// same pre-existing Move Registry `effect` field as every other move —
// see features/battle/healing/resolve-healing.ts,
// features/battle/healing/resolve-hp-transfer.ts (drain + recoil), and
// features/battle/multi-hit/resolve-hit-count.ts for the pure calculations.
// Healing always uses MAXIMUM HP; drain/recoil always use the ACTUAL HP
// the target lost this hit (never the raw Damage Engine output) — see
// those modules' own doc comments. A multi-hit move resolves accuracy
// exactly ONCE for the whole move (its first hit's own resolveAttackDamage
// call); every subsequent hit reuses that same function with
// accuracyAlreadyConfirmed set (see resolveConfirmedHit below and
// engine/damage/damage-types.ts's own doc comment) — the accuracy check
// is skipped entirely for those hits rather than run against a synthetic
// roll, so hit 2..N never re-checks accuracy or copies the damage
// formula. Hit-count is resolved (one roll, only for a non-fixed min/max
// range) AFTER that first hit's own accuracy has already resolved to a
// hit — a miss draws no hit-count roll at all.
//
// Random-draw order per turn (documented here since it's easy to get
// wrong when extending this pipeline; every roll is drawn only when it's
// actually relevant — a skipped/prevented action never draws its
// move-resolution rolls):
//   1. Enemy move selection (selectEnemyMove) — always, before turn order.
//   2. Turn-order tie-break (rollTurnOrderTieBreak) — always.
//   3. The FIRST actor's pre-action status roll (full-paralysis OR
//      freeze-thaw) — ONLY if it's actually paralyzed/frozen.
//   4. If allowed to act:
//      - A healing move (effect.kind "heal"): no roll at all.
//      - A normal/drain/recoil move: damage random factor, accuracy roll,
//        critical roll (always, same as before) — drain/recoil themselves
//        need no additional roll (a pure function of actual damage dealt).
//      - A multi-hit move: hit 1's damage random factor, accuracy roll,
//        critical roll; THEN (only if hit 1 landed, and only if
//        minHits !== maxHits) one hit-count roll; THEN, for each
//        additional hit up to that count (stopping immediately if the
//        target already fainted): one damage random factor + one critical
//        roll (accuracy is never re-rolled).
//      Then, for any move kind: an effect-chance roll (ONLY if its move
//      has a chance-gated secondary effect) and a sleep-duration roll
//      (ONLY if a new sleep status is actually being applied by this
//      move).
//   5. The SECOND actor's same pre-action-status-then-action sequence —
//      but ONLY if the first action already left either side fainted
//      (its own target, or itself via recoil).
// End-of-turn residual damage (burn/poison) draws no random rolls at all
// (a fixed fraction of max HP).
export type BattleActionType = "attack";

// Phase 7 — a compact, UI-facing summary of one side's Volatile
// Conditions, since the FieldBattleSession's own VolatileState never
// reaches the client directly (same principle as playerStatus/enemyStatus
// below — the client only ever learns battle-local state through this
// return shape). disabledMoveId/encoreMoveId are only ever meaningful for
// the PLAYER's own summary (the client selects its own moves, never the
// wild's), but kept on the same shared shape for both sides rather than
// splitting into two near-duplicate types. Now defined once, shared with
// Gym/Regional-Champion Battle, in battle-turn-engine.ts — re-exported
// here so existing callers (e.g. BattleContent.tsx) never had to change
// their import path for this refactor.
export type { BattleVolatileSummary };

export interface BattleActionSuccess {
  status: "success";
  actionType: BattleActionType;
  moveId: string;
  // Phase 6A: which Known Move the wild actually used this turn — the
  // player's own moveId above was already known to the client (it chose
  // it); this is new information the client never had before.
  enemyMoveId: string;

  // Damage dealt this action, in each direction. 0 whenever that side's
  // attack didn't run at all this turn (its target already fainted, its
  // own Pokémon fainted first and never got to act, or its own status
  // prevented it from acting).
  playerDamage: number;
  enemyDamage: number;

  updatedWildHp: number;
  updatedPartyHp: number;

  // Phase 6F — each side's major status AFTER this turn (null when
  // healthy) — the client's only way to know since neither side is
  // otherwise told what status it (or its opponent) currently carries.
  playerStatus: MajorStatus | null;
  enemyStatus: MajorStatus | null;

  // Phase 7 — each side's Volatile Conditions AFTER this turn.
  playerVolatile: BattleVolatileSummary;
  enemyVolatile: BattleVolatileSummary;

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

  // The already-prepared encounter the session was one-ahead on, promoted
  // in this exact same request the instant wildFainted is true (see
  // promoteToNextEncounter, battle-session.service.ts) — the client never
  // makes a second round trip to fetch what comes next, it's simply
  // already here. Null whenever wildFainted is false (nothing to promote),
  // and also null on the rare double-knockout where battleEnded is true in
  // the same turn — the session has already been deleted by then, so
  // there's nothing left to advance into; the client falls back to
  // returning to the map, exactly as it already does whenever a session
  // turns out not to exist.
  promotedWild: EncounterResult | null;

  // The daily battle counter's post-increment value the instant this same
  // action newly promoted an encounter (see AdvancedEncounter,
  // battle-session.service.ts) — null on every path promotedWild is also
  // null on, for the exact same reasons. The client (GameHeader's daily
  // battle pill, via features/player/context/daily-battle-count-context.tsx)
  // applies this directly; nothing here re-derives or re-fetches it.
  dailyBattleCount: number | null;

  // Phase 6A/6D-6I: the whole turn's structured Battle Events, in the
  // exact order they happened — see
  // features/battle/events/battle-event.types.ts. The UI (BattleContent.tsx)
  // formats these into Hebrew via format-battle-events.ts; nothing here is
  // ever a user-facing string.
  events: BattleEvent[];
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
  // this, so every rollX helper falls back to its own Math.random default.
  // Passing a fixed function here is how tests get deterministic rolls
  // without stubbing Math.random globally (see engine/damage/random.ts's
  // own design note).
  randomSource?: () => number,
  // FIELD BATTLE PERFORMANCE — the caller (battle-action.action.ts) already
  // read this exact player's PlayerProfile.regionId one call earlier
  // (getPlayerProfile, needed for `playerId` itself). Passing it through
  // avoids a THIRD read of the same row on a kill turn — this function used
  // to re-fetch it itself via getActiveRegionIdByPlayerId, purely to feed
  // the one-in-many-turns promotion branch below. Optional and only ever
  // used on that exact branch: every existing test call site (and any
  // future caller that doesn't have it handy) simply omits this and falls
  // back to the original query, unchanged.
  regionId?: RegionId
): Promise<BattleActionResult> {
  if (actionType !== "attack") {
    return { status: "invalid-action" };
  }

  // FIELD BATTLE PERFORMANCE — the FieldBattleSession row and the player's
  // party used to be fetched via Promise.all as two independent top-level
  // Prisma calls. Measured against this project's actual remote Neon setup,
  // that was consistently SLOWER than one merged query (~400-500ms vs.
  // under 100ms) — each concurrent top-level call appears to pay its own
  // connection-acquisition cost on this pooled/serverless DB, so "parallel"
  // meant two connection round trips instead of one reused connection. Both
  // are now read through PlayerProfile's own two relations in a single
  // Prisma call (getActiveBattleSessionWithParty, battle-session.service.ts)
  // — same data, same validation below, one round trip instead of two.
  const { session, party } = await getActiveBattleSessionWithParty(playerId);

  if (!session || session.zoneId !== zoneId) {
    return { status: "no-session" };
  }

  // Validate the battle is active: a wild already at 0 HP means this
  // encounter has already concluded. This can't actually happen in normal
  // play any more — a lethal hit promotes the next encounter (nonzero HP)
  // or ends the session (no row at all) in this same request, before this
  // function ever returns — but the check stays as defense-in-depth
  // against a stale/racing duplicate request rather than trusting that
  // invariant blindly.
  if (session.wildCurrentHp <= 0) {
    return { status: "battle-inactive" };
  }

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

  // Phase 7 — Disable/Encore move-selection legality: the same rule the
  // client's own attack panel applies (features/battle/volatile/
  // move-legality.ts), re-checked here as the actual source of truth. A
  // disabled move, or any move other than the one Encore currently forces,
  // is rejected exactly like a move this Pokémon simply doesn't know.
  const initialPlayerVolatile = parseVolatileState(session.playerVolatileState);
  if (!getUsableMoveIds(knownMoveIds, initialPlayerVolatile).includes(moveId)) {
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

  // ---- Phase 6/7: the enemy picks its move before turn order is decided,
  // uniformly at random among whichever of its Known Moves are currently
  // USABLE (Phase 7 — excluding a disabled one, or restricted to the one
  // Encore currently forces) — selectEnemyMove itself is untouched and
  // still picks uniformly; only the candidate list it draws from changes.
  const enemyKnownMoveIds = getStartingKnownMoves(wildSpecies.id, session.wildLevel);
  const initialWildVolatile = parseVolatileState(session.wildVolatileState);
  const usableEnemyMoveIds = getUsableMoveIds(enemyKnownMoveIds, initialWildVolatile);
  const enemyMoveId = selectEnemyMove(usableEnemyMoveIds, randomSource);
  const enemyMove = getMoveById(enemyMoveId);
  if (!enemyMove) {
    throw new UnknownMoveError(enemyMoveId);
  }

  // Plain non-optional aliases: TS control-flow narrowing from the guard
  // checks above doesn't persist into functions/closures declared later in
  // this same scope, so these are captured here, at the point their
  // non-undefined-ness is still known.
  const activePokemonId = activePokemon.id;
  const activeSpecies = activePokemon.species;
  const activeLevel = activePokemon.level;
  const wildSpeciesId = wildSpecies.id;
  const resolvedWildSpecies = wildSpecies;
  const wildLevel = session.wildLevel;

  // ---- Turn resolution ----------------------------------------------------
  // SHARED BATTLE TURN ENGINE — see features/battle/services/
  // battle-turn-engine.ts's own doc comment: this call is the ONLY place a
  // player's attack + the wild's own counter-attack (turn order, damage,
  // move effects, status, volatile conditions, end-of-turn residual
  // effects) are resolved, shared verbatim with Gym/Regional-Champion
  // Battle (Gyms & Leagues Phase 3) — not a second, parallel battle system.
  const turnResult = resolveBattleTurn(
    {
      pokemonId: activePokemonId,
      baseStats: activeSpecies.baseStats,
      level: activeLevel,
      types: activeSpecies.types,
      stages: parseStatStages(session.playerStatStages),
      status: (activePokemon.status as MajorStatus | null) ?? null,
      statusTurnsRemaining: activePokemon.statusTurnsRemaining,
      volatile: initialPlayerVolatile,
      currentHp: activePokemon.currentHp,
      knownMoveIds,
      moveId,
    },
    {
      pokemonId: wildSpeciesId,
      baseStats: resolvedWildSpecies.baseStats,
      level: wildLevel,
      types: resolvedWildSpecies.types,
      stages: parseStatStages(session.wildStatStages),
      status: (session.wildStatus as MajorStatus | null) ?? null,
      statusTurnsRemaining: session.wildStatusTurnsRemaining,
      volatile: initialWildVolatile,
      currentHp: session.wildCurrentHp,
      knownMoveIds: enemyKnownMoveIds,
      moveId: enemyMoveId,
    },
    randomSource
  );

  const events: BattleEvent[] = turnResult.events;
  const updatedPartyHp = turnResult.player.updatedHp;
  const partyPokemonFainted = turnResult.player.fainted;
  const playerDamage = turnResult.player.damageDealt;
  const playerStatus = turnResult.player.status;
  const playerStatusTurnsRemaining = turnResult.player.statusTurnsRemaining;
  const playerStages = turnResult.player.stages;
  const playerVolatile: VolatileState = turnResult.player.volatile;

  const updatedWildHp = turnResult.enemy.updatedHp;
  const wildFainted = turnResult.enemy.fainted;
  const enemyDamage = turnResult.enemy.damageDealt;
  const wildStatus = turnResult.enemy.status;
  const wildStatusTurnsRemaining = turnResult.enemy.statusTurnsRemaining;
  const wildStages = turnResult.enemy.stages;
  const wildVolatile: VolatileState = turnResult.enemy.volatile;

  // ---- Persistence --------------------------------------------------------
  // Always written (simplicity over micro-optimizing away a same-value
  // write): stat stages/status can change from either side's own move
  // (a self-buff), a pre-action wake/thaw, or end-of-turn residual damage
  // — not only from "the other side's attack ran", so the old
  // conditional-write shortcuts no longer capture every case that matters.
  //
  // LATENCY AUDIT — the common, non-lethal case (the wild survives this
  // turn) merges wildCurrentHp into this SAME updateMany, saving the extra
  // round trip syncWildHp's own (now-redundant) write would otherwise cost:
  // updatedWildHp is already guaranteed within [0, wildMaxHp] by every
  // upstream mutation (damage/heal/drain/recoil all clamp themselves — see
  // resolve-healing.ts/resolve-hp-transfer.ts), the exact same clamp
  // syncWildHp's own non-lethal branch would otherwise redundantly
  // recompute. A lethal hit (wildFainted) is deliberately excluded — its
  // wildCurrentHp write must go through applyWildHpSync's own
  // wildDefeatRewardGranted-guarded transaction below (see that function's
  // own doc comment) rather than this plain, unguarded update.
  await prisma.fieldBattleSession.updateMany({
    where: { playerId, zoneId },
    data: {
      wildStatStages: serializeStatStages(wildStages),
      playerStatStages: serializeStatStages(playerStages),
      wildStatus,
      wildStatusTurnsRemaining,
      wildVolatileState: serializeVolatileState(wildVolatile),
      playerVolatileState: serializeVolatileState(playerVolatile),
      ...(wildFainted ? null : { wildCurrentHp: updatedWildHp }),
    },
  });

  // LATENCY AUDIT — applyWildHpSync reuses the exact same session row this
  // function already read at the top (see its own doc comment,
  // battle-session.service.ts) instead of re-querying FieldBattleSession a
  // second time for data that hasn't changed since. Only ever called on an
  // actual kill (wildFainted) — the plain non-lethal write already happened
  // above, merged into the update just before this, so there is nothing
  // left for this call to do (and no reward to grant) on any other turn.
  const experienceGranted = wildFainted
    ? await applyWildHpSync(playerId, zoneId, updatedWildHp, session, randomSource)
    : null;

  await prisma.playerPokemon.update({
    where: { id: activePokemon.id },
    data: { currentHp: updatedPartyHp, status: playerStatus, statusTurnsRemaining: playerStatusTurnsRemaining },
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

  // Promotes the already-prepared next encounter the instant the wild is
  // defeated, in this exact same request — never a second round trip, and
  // never a fresh resolveWildEncounter call on this path (see
  // promoteToNextEncounter's own doc comment). Skipped when the battle is
  // also ending this same turn (a mutual knockout): endBattleSession above
  // already deleted the session row, so there's nothing left to advance —
  // the client falls back to its existing "no session" -> return-to-map
  // handling for that case.
  //
  // Phase 4 / FIELD BATTLE PERFORMANCE — regionId is only ever needed on
  // the one path that actually promotes a new encounter, never on every
  // ordinary attack. The production caller (battle-action.action.ts) now
  // passes its own already-read PlayerProfile.regionId straight through
  // (the `regionId` param above), so this branch costs zero extra DB round
  // trips in production; the getActiveRegionIdByPlayerId fallback only
  // fires for a caller that genuinely doesn't have it on hand (every
  // existing test).
  const advancedEncounter =
    wildFainted && !battleEnded
      ? await promoteToNextEncounter(playerId, zoneId, regionId ?? (await getActiveRegionIdByPlayerId(playerId)))
      : null;

  // Phase 6-cleanup — explicit double-faint resolution. Both sides can
  // faint in the very same action (the wild from the hit, the player's
  // Pokémon from that same move's own recoil) — previously `winner` fell
  // out of `wildFainted ? "player" : battleEnded ? "wild" : null` purely
  // by ternary ordering, so a mutual knockout accidentally reported
  // "player" every time. The explicit rule here: battleEnded (the
  // player's whole party has no usable Pokémon left) takes priority over
  // wildFainted — if the player has nothing left to send out, they lost
  // this battle even though their last action also defeated the wild,
  // the same way a mutual knockout is scored in the mainline games. This
  // changes nothing else: the wild-defeat XP reward (syncWildHp, above)
  // is granted unconditionally and never reads `winner`; neither does
  // capture eligibility or the switching-after-faint flow.
  const winner: "player" | "wild" | null = battleEnded ? "wild" : wildFainted ? "player" : null;

  return {
    status: "success",
    actionType: "attack",
    moveId,
    enemyMoveId,
    playerDamage,
    enemyDamage,
    updatedWildHp,
    updatedPartyHp,
    playerStatus,
    enemyStatus: wildStatus,
    playerVolatile: summarizeVolatile(playerVolatile),
    enemyVolatile: summarizeVolatile(wildVolatile),
    wildFainted,
    partyPokemonFainted,
    battleEnded,
    winner,
    experienceGranted,
    promotedWild: advancedEncounter?.wild ?? null,
    dailyBattleCount: advancedEncounter?.dailyBattleCount ?? null,
    events,
  };
}
