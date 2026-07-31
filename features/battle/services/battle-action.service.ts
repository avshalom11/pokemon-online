import "server-only";

import { calculatePokemonStats } from "@/engine/battle/pokemon-stat-calculations";
import {
  rollAccuracyCheck,
  rollCriticalHit,
  rollDamageRandomFactor,
  UnknownMoveError,
  type CalculateMoveDamageResult,
} from "@/engine/damage";
import { getStartingKnownMoves } from "@/engine/known-moves";
import { getMoveById, type Move, type MoveEffect } from "@/engine/moves";
import type { EncounterResult } from "@/engine/encounter/pokemon-encounter-engine";
import { selectEnemyMove } from "@/features/battle/ai/select-enemy-move";
import {
  endBattleSession,
  markParticipantFainted,
  parseStatStages,
  parseVolatileState,
  promoteToNextEncounter,
  serializeStatStages,
  serializeVolatileState,
  syncWildHp,
  type BattleVictoryReward,
} from "@/features/battle-session/services/battle-session.service";
import { resolveAttackDamage, type DamageBattler } from "@/features/battle/utils/battle-damage-rules";
import type { BattleActor, BattleEvent } from "@/features/battle/events/battle-event.types";
import { buildActionSkippedEvent, buildAttackEvents, buildHitEvents } from "@/features/battle/events/build-attack-events";
import { resolveMoveEffects } from "@/features/battle/effects/resolve-move-effects";
import { resolveHealing } from "@/features/battle/healing/resolve-healing";
import { resolveDrainHealing, resolveRecoilDamage } from "@/features/battle/healing/resolve-hp-transfer";
import { resolveHitCount } from "@/features/battle/multi-hit/resolve-hit-count";
import type { MajorStatus } from "@/features/battle/status/major-status";
import { isMajorStatus } from "@/features/battle/status/major-status";
import { resolvePreActionStatus } from "@/features/battle/status/resolve-pre-action-status";
import { resolveEndOfTurnStatusDamage } from "@/features/battle/status/resolve-end-of-turn-status";
import { applyStatStagesToStats, type StatStages } from "@/features/battle/stats/stat-stages";
import { resolveTurnOrder, rollTurnOrderTieBreak } from "@/features/battle/turn-order/resolve-turn-order";
import { getUsableMoveIds } from "@/features/battle/volatile/move-legality";
import { resolveConfusionSelfDamage } from "@/features/battle/volatile/resolve-confusion-self-damage";
import { resolveEndOfTurnVolatile } from "@/features/battle/volatile/resolve-end-of-turn-volatile";
import { resolvePreActionConfusion, resolvePreActionFlinch } from "@/features/battle/volatile/resolve-pre-action-volatile";
import { isProtected, resolveProtectAttempt, resolveVolatileEffects } from "@/features/battle/volatile/resolve-volatile-effects";
import type { VolatileState } from "@/features/battle/volatile/volatile-condition.types";
import { getKnownMoveIds } from "@/features/known-moves/known-moves-queries";
import { getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { isPartyDefeated } from "@/features/party/utils/party-rules";
import { prisma } from "@/lib/db/prisma";
import type { ZoneId } from "@/shared/types/zone";

// Phase 7 — a move's effect is "volatile" (handled by
// resolve-volatile-effects.ts, never resolve-move-effects.ts) when it's
// one of the dedicated volatile kinds, OR a status/damage-with-status-
// chance whose StatusCondition isn't a MajorStatus (confusion/flinch).
// "protect" is deliberately excluded here — it's self-targeted and always
// resolved separately, before accuracy, never through this hit-gated
// dispatch (see runAttack's own "protect" branch).
function isVolatileEffect(effect: MoveEffect): boolean {
  if (effect.kind === "leech-seed" || effect.kind === "disable-move" || effect.kind === "partial-trap" || effect.kind === "encore") {
    return true;
  }
  if (effect.kind === "status" || effect.kind === "damage-with-status-chance") {
    return !isMajorStatus(effect.status);
  }
  return false;
}

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
// splitting into two near-duplicate types.
export interface BattleVolatileSummary {
  confused: boolean;
  protecting: boolean;
  disabledMoveId: string | null;
  encoreMoveId: string | null;
  leechSeeded: boolean;
  trapped: boolean;
}

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

// Phase 6G — paralysis halves effective Speed (the modern-generation rule
// this project already favors elsewhere), applied on top of stat stages
// rather than a second Speed formula.
const PARALYSIS_SPEED_MULTIPLIER = 0.5;

function effectiveSpeed(battler: DamageBattler): number {
  const stats = applyStatStagesToStats(
    calculatePokemonStats({ baseStats: battler.baseStats, level: battler.level }),
    battler.stages
  );
  const multiplier = battler.status === "paralysis" ? PARALYSIS_SPEED_MULTIPLIER : 1;
  return Math.floor(stats.speed * multiplier);
}

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
  // encounter has already concluded. This can't actually happen in normal
  // play any more — a lethal hit promotes the next encounter (nonzero HP)
  // or ends the session (no row at all) in this same request, before this
  // function ever returns — but the check stays as defense-in-depth
  // against a stale/racing duplicate request rather than trusting that
  // invariant blindly.
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
  const playerMove: Move = move;
  const resolvedEnemyMove: Move = enemyMove;

  function drawRoll(): number {
    return randomSource ? randomSource() : Math.random();
  }

  // ---- Phase 6E/6F: current battle-local stages + persisted status ------
  let playerStages: StatStages = parseStatStages(session.playerStatStages);
  let wildStages: StatStages = parseStatStages(session.wildStatStages);
  let playerStatus: MajorStatus | null = (activePokemon.status as MajorStatus | null) ?? null;
  let playerStatusTurnsRemaining: number | null = activePokemon.statusTurnsRemaining;
  let wildStatus: MajorStatus | null = (session.wildStatus as MajorStatus | null) ?? null;
  let wildStatusTurnsRemaining: number | null = session.wildStatusTurnsRemaining;

  // ---- Phase 7: current battle-local Volatile Conditions ----------------
  let playerVolatile: VolatileState = initialPlayerVolatile;
  let wildVolatile: VolatileState = initialWildVolatile;

  function playerBattler(): DamageBattler {
    return {
      baseStats: activeSpecies.baseStats,
      level: activeLevel,
      types: activeSpecies.types,
      stages: playerStages,
      status: playerStatus,
    };
  }

  function enemyBattler(): DamageBattler {
    return {
      baseStats: resolvedWildSpecies.baseStats,
      level: wildLevel,
      types: resolvedWildSpecies.types,
      stages: wildStages,
      status: wildStatus,
    };
  }

  // Phase 6B/6C/6G — turn order: Move Priority, then effective Speed
  // (stat stages + paralysis halving), then the injected tie-break.
  const playerSpeed = effectiveSpeed(playerBattler());
  const enemySpeed = effectiveSpeed(enemyBattler());
  const tieBreakRoll = rollTurnOrderTieBreak(randomSource);
  const order = resolveTurnOrder({
    playerAction: { actor: "player", priority: playerMove.priority },
    enemyAction: { actor: "enemy", priority: resolvedEnemyMove.priority },
    playerSpeed,
    enemySpeed,
    tieBreakRoll,
  });

  const events: BattleEvent[] = [];
  let updatedWildHp = session.wildCurrentHp;
  let updatedPartyHp = activePokemon.currentHp;
  let wildFainted = false;
  let partyPokemonFainted = false;
  let playerDamage = 0;
  let enemyDamage = 0;

  // Hoisted once — needed by healing/drain (max-HP-based) below, and
  // already needed by the end-of-turn residual-damage section further
  // down, which now reuses these instead of recomputing them itself.
  const playerMaxHp = calculatePokemonStats({ baseStats: activeSpecies.baseStats, level: activeLevel }).maxHp;
  const wildMaxHp = calculatePokemonStats({ baseStats: resolvedWildSpecies.baseStats, level: wildLevel }).maxHp;

  function resolveAndApply(attackerMove: Move, attacker: DamageBattler, defender: DamageBattler): CalculateMoveDamageResult {
    return resolveAttackDamage(
      attackerMove,
      attacker,
      defender,
      rollDamageRandomFactor(randomSource),
      rollAccuracyCheck(randomSource),
      rollCriticalHit(randomSource)
    );
  }

  // Phase 6L / Phase 6-cleanup — every hit after the first one in a
  // multi-hit sequence: the move's own accuracy was already confirmed
  // once (hit 1, via resolveAndApply above). Passes
  // accuracyAlreadyConfirmed through to the Damage Engine (see
  // damage-types.ts's own doc comment) rather than synthesizing a
  // guaranteed-hit accuracyRoll — no accuracy check runs at all for these
  // hits, so no assumption about the move's own accuracy value is needed.
  function resolveConfirmedHit(attackerMove: Move, attacker: DamageBattler, defender: DamageBattler): CalculateMoveDamageResult {
    return resolveAttackDamage(
      attackerMove,
      attacker,
      defender,
      rollDamageRandomFactor(randomSource),
      undefined,
      rollCriticalHit(randomSource),
      true
    );
  }

  // Applies one move's effect — stat-change/major-status (via the existing,
  // untouched resolveMoveEffects) OR a Volatile Condition (via Phase 7's
  // resolveVolatileEffects) — the one generic dispatch every move's
  // `effect` runs through, regardless of who used it or what it does.
  // Exactly one of the two resolvers ever does real work per move (see
  // isVolatileEffect above), so a chance-gated effect is never rolled
  // twice. A no-op for heal/drain/recoil/multi-hit/protect kinds (handled
  // directly in runAttack below), same as it already is for any other
  // not-yet-implemented kind.
  function applyMoveEffect(usedMove: Move, actor: BattleActor, result: CalculateMoveDamageResult, targetJustFainted: boolean): void {
    const effectTargetActor: BattleActor = usedMove.target === "self" ? actor : actor === "player" ? "enemy" : "player";
    const hit = result.kind !== "miss";
    const immuneToTarget = result.kind === "damage" && result.effectiveness === "none";
    const effectTargetFainted = effectTargetActor !== actor && targetJustFainted;
    const targetTypes = effectTargetActor === "player" ? activeSpecies.types : resolvedWildSpecies.types;

    if (isVolatileEffect(usedMove.effect)) {
      const targetVolatile = effectTargetActor === "player" ? playerVolatile : wildVolatile;

      const volatileResult = resolveVolatileEffects({
        effect: usedMove.effect,
        actor,
        effectTargetActor,
        hit,
        immuneToTarget,
        effectTargetFainted,
        effectTargetTypes: targetTypes,
        effectTargetVolatile: targetVolatile,
        effectChanceRoll: drawRoll,
        confusionDurationRoll: drawRoll,
        disableDurationRoll: drawRoll,
        encoreDurationRoll: drawRoll,
        trappingDurationRoll: drawRoll,
      });

      events.push(...volatileResult.events);

      if (effectTargetActor === "player") {
        playerVolatile = volatileResult.updatedTargetVolatile;
      } else {
        wildVolatile = volatileResult.updatedTargetVolatile;
      }
      return;
    }

    const targetStages = effectTargetActor === "player" ? playerStages : wildStages;
    const targetStatus = effectTargetActor === "player" ? playerStatus : wildStatus;

    const effectResult = resolveMoveEffects({
      effect: usedMove.effect,
      effectTargetActor,
      hit,
      immuneToTarget,
      effectTargetFainted,
      effectTargetStages: targetStages,
      effectTargetCurrentStatus: targetStatus,
      effectTargetTypes: targetTypes,
      effectChanceRoll: drawRoll,
      sleepDurationRoll: drawRoll,
    });

    events.push(...effectResult.events);

    if (effectTargetActor === "player") {
      playerStages = effectResult.updatedStages;
    } else {
      wildStages = effectResult.updatedStages;
    }

    if (effectResult.appliedStatus) {
      if (effectTargetActor === "player") {
        playerStatus = effectResult.appliedStatus.status;
        playerStatusTurnsRemaining = effectResult.appliedStatus.turnsRemaining;
      } else {
        wildStatus = effectResult.appliedStatus.status;
        wildStatusTurnsRemaining = effectResult.appliedStatus.turnsRemaining;
      }
    }
  }

  // ---- Small per-actor accessors, so the dispatcher below never repeats
  // the player-vs-enemy branch that used to be duplicated across
  // runPlayerAttack/runEnemyAttack. ----
  function currentHpOf(actor: BattleActor): number {
    return actor === "player" ? updatedPartyHp : updatedWildHp;
  }

  function setHpOf(actor: BattleActor, hp: number): void {
    if (actor === "player") {
      updatedPartyHp = hp;
      partyPokemonFainted = hp <= 0;
    } else {
      updatedWildHp = hp;
      wildFainted = hp <= 0;
    }
  }

  function maxHpOf(actor: BattleActor): number {
    return actor === "player" ? playerMaxHp : wildMaxHp;
  }

  function pokemonIdOf(actor: BattleActor): string {
    return actor === "player" ? activePokemonId : wildSpeciesId;
  }

  // Phase 7 — re-validated at the moment of execution (not just at initial
  // submission/selection), in case the OTHER actor's own effect — having
  // gone first this same turn — just disabled or encored this actor's
  // already-chosen move. Falls back to that side's own first still-usable
  // Known Move rather than executing an illegal one; the safest simple
  // fallback this project's Disable/Encore rules call for, same spirit as
  // getUsableMoveIds's own empty-list fallback (never Struggle, never a
  // crash). In the overwhelming majority of turns nothing changes here at
  // all — the chosen move was already validated usable before either
  // action ran.
  function moveIdOf(actor: BattleActor): string {
    const chosen = actor === "player" ? moveId : enemyMoveId;
    const knownIds = actor === "player" ? knownMoveIds : enemyKnownMoveIds;
    const volatile = actor === "player" ? playerVolatile : wildVolatile;
    const usable = getUsableMoveIds(knownIds, volatile);
    return usable.includes(chosen) ? chosen : usable[0];
  }

  function moveOf(actor: BattleActor): Move {
    const id = moveIdOf(actor);
    // Falls back to the originally-chosen Move only in the practically
    // unreachable case of a corrupt/unregistered known-move id — every
    // real Known Move id always resolves (engine/known-moves enforces
    // this at write time), so this is a safety net, never the normal path.
    return getMoveById(id) ?? (actor === "player" ? playerMove : resolvedEnemyMove);
  }

  function battlerOf(actor: BattleActor): DamageBattler {
    return actor === "player" ? playerBattler() : enemyBattler();
  }

  function setDamageOf(actor: BattleActor, damage: number): void {
    if (actor === "player") {
      playerDamage = damage;
    } else {
      enemyDamage = damage;
    }
  }

  // Phase 6L — resolves one multi-hit move: one accuracy check for the
  // whole move (hit 1, above), then (only on a hit, and only for a
  // non-fixed range) one hit-count roll, then each additional hit
  // independently — stopping immediately, drawing no further rolls, the
  // instant the target reaches 0 HP. Drain/recoil aren't reachable on a
  // multi-hit move in the current Move Registry (a move's `effect` is a
  // single kind, never both) — see this file's header comment.
  function runMultiHitAttack(actor: BattleActor, move: Move, target: BattleActor): void {
    const attackerId = pokemonIdOf(actor);
    const usedMoveId = moveIdOf(actor);

    const firstResult = resolveAndApply(move, battlerOf(actor), battlerOf(target));

    // Phase 7 — Protect stops a multi-hit move before its first hit is
    // ever applied (no partial damage, no multi-hit-complete event at
    // all) — accuracy is still resolved above first (this project's
    // documented move-execution order resolves accuracy before checking
    // Protect), it just never gets acted on.
    if (isProtected(target === "player" ? playerVolatile : wildVolatile)) {
      events.push({ type: "protected", actor: target });
      setDamageOf(actor, 0);
      return;
    }

    if (firstResult.kind !== "damage") {
      if (firstResult.kind === "miss") {
        events.push({ type: "move-missed", actor, pokemonId: attackerId, moveId: usedMoveId });
      }
      setDamageOf(actor, 0);
      return;
    }

    if (move.effect.kind !== "multi-hit") return; // unreachable — narrows the type below.

    const hitCount = resolveHitCount(move.effect, drawRoll);
    let totalDamageDealt = 0;
    let hitsCompleted = 0;
    let targetFainted = false;

    for (let hitNumber = 1; hitNumber <= hitCount; hitNumber++) {
      const hitResult = hitNumber === 1 ? firstResult : resolveConfirmedHit(move, battlerOf(actor), battlerOf(target));
      const damage = hitResult.kind === "damage" ? hitResult.damage : 0;
      const previousTargetHp = currentHpOf(target);
      const newTargetHp = Math.max(0, previousTargetHp - damage);
      setHpOf(target, newTargetHp);
      totalDamageDealt += previousTargetHp - newTargetHp;
      hitsCompleted += 1;

      events.push(...buildHitEvents({ actor, defenderPokemonId: pokemonIdOf(target), result: hitResult, remainingDefenderHp: newTargetHp }));

      if (newTargetHp <= 0) {
        targetFainted = true;
        break;
      }
    }

    setDamageOf(actor, totalDamageDealt);
    events.push({ type: "multi-hit-complete", actor, hits: hitsCompleted });

    // No currently-configured multi-hit move carries a secondary status/
    // stat-change effect — this is a no-op today (resolveMoveEffects's
    // default branch), kept for the same reason applyMoveEffect is always
    // called from the normal single-hit path below.
    applyMoveEffect(move, actor, firstResult, targetFainted);
  }

  // Phase 7 — records this exact move as the actor's own
  // lastUsedMoveId (Disable/Encore both target "the opponent's last
  // successfully used move" — see resolve-volatile-effects.ts) whenever
  // the actor actually attempts a move this turn, hit or miss alike; a
  // prevented actor (asleep, flinched, confused self-hit, ...) never
  // reaches this at all, since it's only ever called from inside
  // runAttack. Also resets Protect's own streak the instant the actor
  // uses anything OTHER than Protect — see resolveProtectAttempt's own
  // doc comment for why a non-Protect turn always breaks the streak.
  function recordMoveUsage(actor: BattleActor, usedMoveId: string, isProtectMove: boolean): void {
    const current = actor === "player" ? playerVolatile : wildVolatile;
    const updated: VolatileState = {
      ...current,
      lastUsedMoveId: usedMoveId,
      protect: isProtectMove ? current.protect : undefined,
    };
    if (actor === "player") {
      playerVolatile = updated;
    } else {
      wildVolatile = updated;
    }
  }

  // Phase 6J-6L/7 — the one dispatcher every actor's action goes through,
  // branching only on the move's own `effect.kind` (never its id/name).
  function runAttack(actor: BattleActor): void {
    const move = moveOf(actor);
    const attackerId = pokemonIdOf(actor);
    const usedMoveId = moveIdOf(actor);
    const target: BattleActor = actor === "player" ? "enemy" : "player";

    recordMoveUsage(actor, usedMoveId, move.effect.kind === "protect");

    if (move.effect.kind === "protect") {
      events.push({ type: "move-used", actor, pokemonId: attackerId, moveId: usedMoveId });

      const currentVolatile = actor === "player" ? playerVolatile : wildVolatile;
      const protectResult = resolveProtectAttempt(actor, currentVolatile, drawRoll);
      events.push(protectResult.event);
      if (actor === "player") {
        playerVolatile = protectResult.updatedVolatile;
      } else {
        wildVolatile = protectResult.updatedVolatile;
      }
      setDamageOf(actor, 0);
      return;
    }

    if (move.effect.kind === "heal") {
      events.push({ type: "move-used", actor, pokemonId: attackerId, moveId: usedMoveId });

      const healResult = resolveHealing({
        currentHp: currentHpOf(actor),
        maxHp: maxHpOf(actor),
        healPercent: move.effect.healPercent,
      });
      setHpOf(actor, healResult.remainingHp);
      setDamageOf(actor, 0);

      events.push(
        healResult.success
          ? { type: "healed", actor, amount: healResult.healed, remainingHp: healResult.remainingHp, source: "move" }
          : { type: "healing-failed", actor, reason: "full-hp" }
      );
      return;
    }

    if (move.effect.kind === "multi-hit") {
      events.push({ type: "move-used", actor, pokemonId: attackerId, moveId: usedMoveId });
      runMultiHitAttack(actor, move, target);
      return;
    }

    // Normal single-hit path — covers plain damage, status moves,
    // stat-change/status (chance-gated or guaranteed), and drain/recoil
    // (both layered on top of the same damage result below).
    const result = resolveAndApply(move, battlerOf(actor), battlerOf(target));

    // Phase 7 — Protect: self-targeted effects are never blocked (this
    // whole check is skipped for them), and this project's documented
    // move-execution order resolves accuracy BEFORE checking Protect —
    // the roll above still happens even when Protect ends up blocking
    // everything that would have followed it. The move-used event still
    // fires (already pushed by the caller for multi-hit/heal, and
    // explicitly here since buildAttackEvents — which would otherwise
    // push it — is skipped entirely below); no damage/status/stat-change
    // event of any kind is ever emitted for a blocked target.
    if (move.target !== "self" && isProtected(target === "player" ? playerVolatile : wildVolatile)) {
      events.push({ type: "move-used", actor, pokemonId: attackerId, moveId: usedMoveId });
      events.push({ type: "protected", actor: target });
      setDamageOf(actor, 0);
      return;
    }

    const damageDealt = result.kind === "damage" ? result.damage : 0;
    setDamageOf(actor, damageDealt);

    const previousTargetHp = currentHpOf(target);
    const newTargetHp = Math.max(0, previousTargetHp - damageDealt);
    setHpOf(target, newTargetHp);
    const actualDamageDealt = previousTargetHp - newTargetHp;

    events.push(
      ...buildAttackEvents({
        actor,
        attackerPokemonId: attackerId,
        defenderPokemonId: pokemonIdOf(target),
        moveId: usedMoveId,
        result,
        remainingDefenderHp: newTargetHp,
      })
    );

    // Phase 6K — drain: heals the attacker off the target's ACTUAL HP loss
    // (never the raw calculated damage). Applies even if the target then
    // faints from this same hit — draining life happens as the damage
    // lands, independent of the target's own fate.
    if (move.effect.kind === "drain" && actualDamageDealt > 0) {
      const drainResult = resolveDrainHealing({
        actualDamageDealt,
        drainPercent: move.effect.drainPercent,
        currentHp: currentHpOf(actor),
        maxHp: maxHpOf(actor),
      });
      if (drainResult.healed > 0) {
        setHpOf(actor, drainResult.remainingHp);
        events.push({ type: "healed", actor, amount: drainResult.healed, remainingHp: drainResult.remainingHp, source: "drain" });
      }
    }

    // Phase 6K — recoil: damages the attacker off the target's ACTUAL HP
    // loss. Can faint the attacker; both faints (target from the hit,
    // attacker from its own recoil) are always emitted in that
    // chronological order.
    if (move.effect.kind === "recoil" && actualDamageDealt > 0) {
      const recoilResult = resolveRecoilDamage({
        actualDamageDealt,
        recoilPercent: move.effect.recoilPercent,
        currentHp: currentHpOf(actor),
      });
      setHpOf(actor, recoilResult.remainingHp);
      events.push({ type: "recoil-damage", actor, damage: recoilResult.damage, remainingHp: recoilResult.remainingHp });
      if (recoilResult.remainingHp <= 0) {
        events.push({ type: "fainted", actor, pokemonId: attackerId });
      }
    }

    applyMoveEffect(move, actor, result, newTargetHp <= 0);
  }

  // Phase 6G/7 — immediately before an actor's action, check whether it
  // actually gets to attempt its move this turn at all. Documented order
  // (this project's own, since none of these are mutually exclusive —
  // a Pokémon can be flinched AND paralyzed AND confused all at once):
  // 1. Flinch. 2. Major status (sleep/freeze/paralysis, existing
  // resolvePreActionStatus, untouched). 3. Confusion. Each one that
  // prevents the action returns immediately — the later checks never run
  // at all, and never draw their own rolls, exactly like a fainted target
  // never draws move-resolution rolls.
  function runActorTurn(actor: BattleActor): void {
    const isPlayerActor = actor === "player";
    const volatile = isPlayerActor ? playerVolatile : wildVolatile;

    // 1. Flinch — a same-turn-only flag, consumed (cleared) the instant
    // it's checked, whether or not it actually prevents anything this
    // check (it's already false if it doesn't apply).
    if (resolvePreActionFlinch(volatile)) {
      const cleared: VolatileState = { ...volatile, flinch: false };
      if (isPlayerActor) {
        playerVolatile = cleared;
      } else {
        wildVolatile = cleared;
      }
      events.push({ type: "volatile-prevented-action", actor, condition: "flinch" });
      return;
    }

    // 2. Major status (unchanged Phase 6G machinery).
    const status = isPlayerActor ? playerStatus : wildStatus;
    const sleepTurnsRemaining = isPlayerActor ? playerStatusTurnsRemaining : wildStatusTurnsRemaining;

    const preAction = resolvePreActionStatus({
      status,
      sleepTurnsRemaining,
      fullParalysisRoll: drawRoll,
      freezeThawRoll: drawRoll,
    });

    if (isPlayerActor) {
      playerStatus = preAction.status;
      playerStatusTurnsRemaining = preAction.sleepTurnsRemaining;
    } else {
      wildStatus = preAction.status;
      wildStatusTurnsRemaining = preAction.sleepTurnsRemaining;
    }

    if (preAction.outcome === "fully-paralyzed" || preAction.outcome === "asleep" || preAction.outcome === "frozen") {
      events.push({ type: "status-prevented-action", actor, status: preAction.outcome === "fully-paralyzed" ? "paralysis" : preAction.outcome === "asleep" ? "sleep" : "freeze" });
      return;
    }

    if (preAction.outcome === "woke-up") {
      // Waking up still consumes this turn's action — see
      // resolve-pre-action-status.ts's own documented rule.
      events.push({ type: "status-recovered", actor, status: "sleep" });
      return;
    }

    if (preAction.outcome === "thawed") {
      events.push({ type: "status-recovered", actor, status: "freeze" });
    }

    // 3. Confusion — checked after major status, per this file's own
    // documented order. Recovering this turn does NOT consume the
    // action (real-game behavior — see resolve-pre-action-volatile.ts);
    // hurting itself does.
    const confusionResult = resolvePreActionConfusion({
      confusion: (isPlayerActor ? playerVolatile : wildVolatile).confusion,
      selfHitRoll: drawRoll,
    });

    if (confusionResult.outcome === "recovered") {
      const updated: VolatileState = { ...(isPlayerActor ? playerVolatile : wildVolatile), confusion: undefined };
      if (isPlayerActor) {
        playerVolatile = updated;
      } else {
        wildVolatile = updated;
      }
      events.push({ type: "volatile-recovered", actor, condition: "confusion" });
    } else if (confusionResult.outcome !== "not-confused") {
      const updated: VolatileState = {
        ...(isPlayerActor ? playerVolatile : wildVolatile),
        confusion: confusionResult.updatedConfusion,
      };
      if (isPlayerActor) {
        playerVolatile = updated;
      } else {
        wildVolatile = updated;
      }

      if (confusionResult.outcome === "hurts-itself") {
        events.push({ type: "volatile-prevented-action", actor, condition: "confusion" });

        const battler = battlerOf(actor);
        const effectiveStats = applyStatStagesToStats(
          calculatePokemonStats({ baseStats: battler.baseStats, level: battler.level }),
          battler.stages
        );
        const selfDamage = resolveConfusionSelfDamage(
          battler.level,
          effectiveStats.attack,
          effectiveStats.defense,
          rollDamageRandomFactor(randomSource)
        );

        const previousHp = currentHpOf(actor);
        const newHp = Math.max(0, previousHp - selfDamage);
        setHpOf(actor, newHp);
        events.push({ type: "confusion-self-damage", actor, damage: selfDamage, remainingHp: newHp });
        if (newHp <= 0) {
          events.push({ type: "fainted", actor, pokemonId: pokemonIdOf(actor) });
        }
        return;
      }
    }

    runAttack(actor);
  }

  const [firstActor, secondActor] = order;
  runActorTurn(firstActor);

  // Phase 6/6K/6-cleanup — if the first action left EITHER side fainted,
  // the second action never happens at all this turn: no roll of any
  // kind is drawn for it, no counterattack lands, and nothing attacks an
  // already-fainted Pokémon. The reason differs depending on WHICH side
  // fainted, since only one of these actually describes the second
  // actor's own Pokémon:
  //   - secondActor's own Pokémon fainted (from firstActor's damage) —
  //     "fainted-before-action", the original Phase 6A-C rule.
  //   - firstActor's own Pokémon fainted from its OWN recoil (Phase 6K) —
  //     secondActor's own Pokémon is perfectly healthy, it simply has no
  //     one left to attack, so "no-valid-target" is the accurate reason
  //     rather than reusing "fainted-before-action" for a Pokémon that
  //     never fainted at all. Checked in this order so the (rare) case
  //     where both sides faint in the same action still reports the more
  //     specific, self-evident "fainted-before-action".
  const secondActorOwnPokemonFainted = secondActor === "player" ? partyPokemonFainted : wildFainted;
  const firstActorOwnPokemonFainted = firstActor === "player" ? partyPokemonFainted : wildFainted;

  if (secondActorOwnPokemonFainted) {
    events.push(buildActionSkippedEvent(secondActor, "fainted-before-action"));
  } else if (firstActorOwnPokemonFainted) {
    events.push(buildActionSkippedEvent(secondActor, "no-valid-target"));
  } else {
    runActorTurn(secondActor);
  }

  // ---- Phase 6H: end-of-turn burn/poison residual damage -----------------
  // Processed player-then-enemy, one documented stable order, only for a
  // side that's still active (not already fainted this turn).
  if (!partyPokemonFainted) {
    const residual = resolveEndOfTurnStatusDamage(playerStatus, updatedPartyHp, playerMaxHp);
    if (residual) {
      updatedPartyHp = residual.remainingHp;
      partyPokemonFainted = updatedPartyHp <= 0;
      events.push({ type: "status-damage", actor: "player", status: playerStatus as "burn" | "poison", damage: residual.damage, remainingHp: updatedPartyHp });
      if (partyPokemonFainted) events.push({ type: "fainted", actor: "player", pokemonId: activePokemonId });
    }
  }

  if (!wildFainted) {
    const residual = resolveEndOfTurnStatusDamage(wildStatus, updatedWildHp, wildMaxHp);
    if (residual) {
      updatedWildHp = residual.remainingHp;
      wildFainted = updatedWildHp <= 0;
      events.push({ type: "status-damage", actor: "enemy", status: wildStatus as "burn" | "poison", damage: residual.damage, remainingHp: updatedWildHp });
      if (wildFainted) events.push({ type: "fainted", actor: "enemy", pokemonId: wildSpeciesId });
    }
  }

  // ---- Phase 7: end-of-turn Leech Seed + trapping residual effects ------
  // Processed player-then-enemy, same stable order/fainted-guard as burn/
  // poison above. Leech Seed's actual HP loss heals the OPPONENT (reusing
  // resolveDrainHealing at 100% — an "actual HP lost, clamped to max HP"
  // heal is exactly drain's own rule, never duplicated here) — applied
  // only if the healing recipient isn't itself already fainted.
  if (!partyPokemonFainted) {
    const result = resolveEndOfTurnVolatile({
      actor: "player",
      volatile: playerVolatile,
      currentHp: updatedPartyHp,
      maxHp: playerMaxHp,
      opponentFainted: wildFainted,
    });
    playerVolatile = result.updatedVolatile;
    updatedPartyHp = result.updatedHp;
    partyPokemonFainted = result.fainted;
    events.push(...result.events);
    if (partyPokemonFainted) events.push({ type: "fainted", actor: "player", pokemonId: activePokemonId });

    if (result.leechSeedDrainAmount > 0 && !wildFainted) {
      const healResult = resolveDrainHealing({
        actualDamageDealt: result.leechSeedDrainAmount,
        drainPercent: 100,
        currentHp: updatedWildHp,
        maxHp: wildMaxHp,
      });
      if (healResult.healed > 0) {
        updatedWildHp = healResult.remainingHp;
        events.push({ type: "healed", actor: "enemy", amount: healResult.healed, remainingHp: healResult.remainingHp, source: "drain" });
      }
    }
  }

  if (!wildFainted) {
    const result = resolveEndOfTurnVolatile({
      actor: "enemy",
      volatile: wildVolatile,
      currentHp: updatedWildHp,
      maxHp: wildMaxHp,
      opponentFainted: partyPokemonFainted,
    });
    wildVolatile = result.updatedVolatile;
    updatedWildHp = result.updatedHp;
    wildFainted = result.fainted;
    events.push(...result.events);
    if (wildFainted) events.push({ type: "fainted", actor: "enemy", pokemonId: wildSpeciesId });

    if (result.leechSeedDrainAmount > 0 && !partyPokemonFainted) {
      const healResult = resolveDrainHealing({
        actualDamageDealt: result.leechSeedDrainAmount,
        drainPercent: 100,
        currentHp: updatedPartyHp,
        maxHp: playerMaxHp,
      });
      if (healResult.healed > 0) {
        updatedPartyHp = healResult.remainingHp;
        events.push({ type: "healed", actor: "player", amount: healResult.healed, remainingHp: healResult.remainingHp, source: "drain" });
      }
    }
  }

  // Phase 7 — flinch is same-turn-only; whichever side never got a
  // chance to consume it this turn (already acted before it was applied,
  // or was never due to act again) must not carry it into the next call.
  if (playerVolatile.flinch) playerVolatile = { ...playerVolatile, flinch: false };
  if (wildVolatile.flinch) wildVolatile = { ...wildVolatile, flinch: false };

  // ---- Persistence --------------------------------------------------------
  // Always written (simplicity over micro-optimizing away a same-value
  // write): stat stages/status can change from either side's own move
  // (a self-buff), a pre-action wake/thaw, or end-of-turn residual damage
  // — not only from "the other side's attack ran", so the old
  // conditional-write shortcuts no longer capture every case that matters.
  await prisma.fieldBattleSession.updateMany({
    where: { playerId, zoneId },
    data: {
      wildStatStages: serializeStatStages(wildStages),
      playerStatStages: serializeStatStages(playerStages),
      wildStatus,
      wildStatusTurnsRemaining,
      wildVolatileState: serializeVolatileState(wildVolatile),
      playerVolatileState: serializeVolatileState(playerVolatile),
    },
  });

  const experienceGranted = await syncWildHp(playerId, zoneId, updatedWildHp, randomSource);

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
  const advancedEncounter = wildFainted && !battleEnded ? await promoteToNextEncounter(playerId, zoneId) : null;

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

  function summarizeVolatile(volatile: VolatileState): BattleVolatileSummary {
    return {
      confused: Boolean(volatile.confusion),
      protecting: Boolean(volatile.protect?.active),
      disabledMoveId: volatile.disable?.moveId ?? null,
      encoreMoveId: volatile.encore?.moveId ?? null,
      leechSeeded: Boolean(volatile.leechSeed),
      trapped: Boolean(volatile.trapping),
    };
  }

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
    events,
  };
}
