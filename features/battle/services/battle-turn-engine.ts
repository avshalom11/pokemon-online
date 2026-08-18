import "server-only";

import { calculatePokemonStats } from "@/engine/battle/pokemon-stat-calculations";
import { rollAccuracyCheck, rollCriticalHit, rollDamageRandomFactor, UnknownMoveError, type CalculateMoveDamageResult } from "@/engine/damage";
import { getMoveById, type Move, type MoveEffect } from "@/engine/moves";
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
import type { PokemonBaseStats, PokemonType } from "@/shared/types/pokemon";

// SHARED BATTLE TURN ENGINE — extracted verbatim (same call sequence, same
// pure engine functions, same random-draw order) from
// battle-action.service.ts's executeBattleAction, so Field Battle and Gym/
// Regional-Champion Battle (Gyms & Leagues Phase 3) resolve a turn through
// exactly ONE implementation — never two parallel battle systems. Neither
// this file nor anything it calls knows about FieldBattleSession,
// NpcBattleSession, Prisma, or rewards: it is pure orchestration over the
// same engine/ and features/battle/* pure resolvers battle-action.service.ts
// already used, taking two generic "battler" descriptions in and returning
// the fully-resolved turn out. Each caller is responsible for:
//   - selecting the enemy's move BEFORE calling this (its own AI concern —
//     Field Battle always uses uniform selectEnemyMove; Gym Battle uses a
//     difficulty-aware selector, see features/gyms/services/
//     gym-npc-ai.ts) — this engine only re-validates that choice is still
//     legal at the moment each actor actually acts (Disable/Encore can
//     change mid-turn), it never re-picks a different move itself.
//   - all persistence (HP/status/stat-stage/volatile writes, victory/
//     defeat handling, rewards) — this function returns plain data only.
export type TurnBattlerSide = "player" | "enemy";

export interface TurnBattlerInput {
  // Identifies this side's active Pokémon in emitted BattleEvents — an
  // owned-Pokémon id for the player side, a species id for the
  // enemy side (wild OR NPC — both already used a species id here before
  // this extraction).
  readonly pokemonId: string;
  readonly baseStats: PokemonBaseStats;
  readonly level: number;
  readonly types: readonly PokemonType[];
  readonly stages: StatStages;
  readonly status: MajorStatus | null;
  readonly statusTurnsRemaining: number | null;
  readonly volatile: VolatileState;
  readonly currentHp: number;
  // Every move this side currently knows — used only to re-validate the
  // chosen move is still legal (Disable/Encore) at the moment this side
  // actually acts, mirroring moveIdOf's own doc comment.
  readonly knownMoveIds: readonly string[];
  // The move this side will attempt this turn — already selected by the
  // caller (the player's own submitted choice; the enemy's own AI pick).
  readonly moveId: string;
}

export interface TurnBattlerResult {
  readonly updatedHp: number;
  readonly fainted: boolean;
  readonly damageDealt: number;
  readonly status: MajorStatus | null;
  readonly statusTurnsRemaining: number | null;
  readonly stages: StatStages;
  readonly volatile: VolatileState;
}

export interface TurnResolutionResult {
  readonly player: TurnBattlerResult;
  readonly enemy: TurnBattlerResult;
  readonly events: BattleEvent[];
}

// A compact, UI-facing summary of one side's Volatile Conditions — shared
// by Field Battle (battle-action.service.ts) and Gym/Regional-Champion
// Battle (features/gyms/services/gym-battle-action.service.ts) so both
// battle types report this exact same shape to their callers, never two
// slightly-different summarizers.
export interface BattleVolatileSummary {
  readonly confused: boolean;
  readonly protecting: boolean;
  readonly disabledMoveId: string | null;
  readonly encoreMoveId: string | null;
  readonly leechSeeded: boolean;
  readonly trapped: boolean;
}

export function summarizeVolatile(volatile: VolatileState): BattleVolatileSummary {
  return {
    confused: Boolean(volatile.confusion),
    protecting: Boolean(volatile.protect?.active),
    disabledMoveId: volatile.disable?.moveId ?? null,
    encoreMoveId: volatile.encore?.moveId ?? null,
    leechSeeded: Boolean(volatile.leechSeed),
    trapped: Boolean(volatile.trapping),
  };
}

// Phase 7 — a move's effect is "volatile" (handled by
// resolve-volatile-effects.ts, never resolve-move-effects.ts) when it's one
// of the dedicated volatile kinds, OR a status/damage-with-status-chance
// whose StatusCondition isn't a MajorStatus (confusion/flinch). "protect" is
// deliberately excluded — self-targeted, always resolved separately.
function isVolatileEffect(effect: MoveEffect): boolean {
  if (effect.kind === "leech-seed" || effect.kind === "disable-move" || effect.kind === "partial-trap" || effect.kind === "encore") {
    return true;
  }
  if (effect.kind === "status" || effect.kind === "damage-with-status-chance") {
    return !isMajorStatus(effect.status);
  }
  return false;
}

// Paralysis halves effective Speed (the modern-generation rule this project
// already favors elsewhere), applied on top of stat stages.
const PARALYSIS_SPEED_MULTIPLIER = 0.5;

function effectiveSpeed(battler: DamageBattler): number {
  const stats = applyStatStagesToStats(calculatePokemonStats({ baseStats: battler.baseStats, level: battler.level }), battler.stages);
  const multiplier = battler.status === "paralysis" ? PARALYSIS_SPEED_MULTIPLIER : 1;
  return Math.floor(stats.speed * multiplier);
}

// Resolves one full turn between `player` and `enemy` — both actors'
// actions, in Speed/Priority order, plus end-of-turn residual effects
// (status damage, Leech Seed/trapping). Throws UnknownMoveError only if a
// caller passes a moveId that isn't a real Move Registry entry at all (both
// callers already validate this before invoking the engine; this is a
// defense-in-depth guard, not a normal path).
// VOLUNTARY SWITCH / BAG ITEM — SOLO ENEMY STRIKE (Gym Battle UX task,
// section 5/15). A switch or a Bag-item use is not really "the player's
// move" — there is no second moveId to hand resolveBattleTurn's normal
// two-sided contract, and this engine has no "pass" pseudo-move. Rather
// than force one in (or duplicate resolveBattleTurn's own internal turn
// order/status/multi-hit machinery here), this is a small, deliberately
// SIMPLIFIED, additive, one-sided resolution: the enemy's already-chosen
// move (selected upstream by the caller's own difficulty-aware AI, exactly
// like resolveBattleTurn expects) lands a single hit against the player's
// (already switched-in, if applicable) defender. Reuses the exact same
// damage/effect primitives resolveBattleTurn itself uses — never a second
// damage formula.
//
// Deliberate scope limits, so this stays genuinely small and low-risk
// rather than re-implementing the full engine a second time: no multi-hit
// expansion (only the first hit lands), no Protect/volatile-effect
// handling, no residual/end-of-turn status damage this "turn". Ordinary
// NPC move pools are attack (with an optional status chance) moves, so this
// covers the overwhelming majority of real Gym opponents correctly; a
// multi-hit or purely-volatile NPC move simply behaves as a single plain
// hit here. Never called by Field Battle or League PvP — purely additive,
// zero risk to either.
export interface SoloStrikeDefender {
  readonly pokemonId: string;
  readonly baseStats: PokemonBaseStats;
  readonly level: number;
  readonly types: readonly PokemonType[];
  readonly status: MajorStatus | null;
  readonly currentHp: number;
}

export interface SoloStrikeResult {
  readonly updatedDefenderHp: number;
  readonly defenderFainted: boolean;
  readonly damageDealt: number;
  readonly appliedStatus: MajorStatus | null;
  readonly appliedStatusTurnsRemaining: number | null;
  readonly events: BattleEvent[];
}

export function resolveSoloEnemyStrike(enemy: TurnBattlerInput, defender: SoloStrikeDefender, randomSource?: () => number): SoloStrikeResult {
  const moveLookup = getMoveById(enemy.moveId);
  if (!moveLookup) throw new UnknownMoveError(enemy.moveId);
  const move: Move = moveLookup;

  const attacker: DamageBattler = { baseStats: enemy.baseStats, level: enemy.level, types: enemy.types, stages: enemy.stages, status: enemy.status };
  const target: DamageBattler = { baseStats: defender.baseStats, level: defender.level, types: defender.types, stages: {}, status: defender.status };

  const result = resolveAttackDamage(
    move,
    attacker,
    target,
    rollDamageRandomFactor(randomSource),
    rollAccuracyCheck(randomSource),
    rollCriticalHit(randomSource)
  );

  const damageDealt = result.kind === "damage" ? result.damage : 0;
  const updatedDefenderHp = Math.max(0, defender.currentHp - damageDealt);
  const defenderFainted = updatedDefenderHp <= 0;

  const events = buildAttackEvents({
    actor: "enemy",
    attackerPokemonId: enemy.pokemonId,
    defenderPokemonId: defender.pokemonId,
    moveId: enemy.moveId,
    result,
    remainingDefenderHp: updatedDefenderHp,
  });

  let appliedStatus: MajorStatus | null = defender.status;
  let appliedStatusTurnsRemaining: number | null = null;

  if (!defenderFainted && move.effect.kind === "status" && isMajorStatus(move.effect.status)) {
    const effectResult = resolveMoveEffects({
      effect: move.effect,
      effectTargetActor: "player",
      hit: result.kind !== "miss",
      immuneToTarget: result.kind === "damage" && result.effectiveness === "none",
      effectTargetFainted: false,
      effectTargetStages: {},
      effectTargetCurrentStatus: defender.status,
      effectTargetTypes: defender.types,
      effectChanceRoll: () => (randomSource ? randomSource() : Math.random()),
      sleepDurationRoll: () => (randomSource ? randomSource() : Math.random()),
    });
    if (effectResult.appliedStatus) {
      appliedStatus = effectResult.appliedStatus.status;
      appliedStatusTurnsRemaining = effectResult.appliedStatus.turnsRemaining;
    }
  }

  return { updatedDefenderHp, defenderFainted, damageDealt, appliedStatus, appliedStatusTurnsRemaining, events };
}

export function resolveBattleTurn(player: TurnBattlerInput, enemy: TurnBattlerInput, randomSource?: () => number): TurnResolutionResult {
  const playerMoveLookup = getMoveById(player.moveId);
  if (!playerMoveLookup) throw new UnknownMoveError(player.moveId);
  const enemyMoveLookup = getMoveById(enemy.moveId);
  if (!enemyMoveLookup) throw new UnknownMoveError(enemy.moveId);
  // Explicitly re-typed (not just narrowed) — TS's control-flow narrowing
  // from the guards above doesn't persist into the nested `function`
  // declarations below (moveOf's own fallback reads these), same reason
  // the pre-extraction code in battle-action.service.ts captured this same
  // pair of aliases explicitly rather than relying on the guard alone.
  const playerMove: Move = playerMoveLookup;
  const enemyMove: Move = enemyMoveLookup;

  function drawRoll(): number {
    return randomSource ? randomSource() : Math.random();
  }

  let playerStages: StatStages = player.stages;
  let wildStages: StatStages = enemy.stages;
  let playerStatus: MajorStatus | null = player.status;
  let playerStatusTurnsRemaining: number | null = player.statusTurnsRemaining;
  let wildStatus: MajorStatus | null = enemy.status;
  let wildStatusTurnsRemaining: number | null = enemy.statusTurnsRemaining;

  let playerVolatile: VolatileState = player.volatile;
  let wildVolatile: VolatileState = enemy.volatile;

  function playerBattler(): DamageBattler {
    return { baseStats: player.baseStats, level: player.level, types: player.types, stages: playerStages, status: playerStatus };
  }

  function enemyBattler(): DamageBattler {
    return { baseStats: enemy.baseStats, level: enemy.level, types: enemy.types, stages: wildStages, status: wildStatus };
  }

  const playerSpeed = effectiveSpeed(playerBattler());
  const enemySpeed = effectiveSpeed(enemyBattler());
  const tieBreakRoll = rollTurnOrderTieBreak(randomSource);
  const order = resolveTurnOrder({
    playerAction: { actor: "player", priority: playerMove.priority },
    enemyAction: { actor: "enemy", priority: enemyMove.priority },
    playerSpeed,
    enemySpeed,
    tieBreakRoll,
  });

  const events: BattleEvent[] = [];
  let updatedWildHp = enemy.currentHp;
  let updatedPartyHp = player.currentHp;
  let wildFainted = false;
  let partyPokemonFainted = false;
  let playerDamage = 0;
  let enemyDamage = 0;

  const playerMaxHp = calculatePokemonStats({ baseStats: player.baseStats, level: player.level }).maxHp;
  const wildMaxHp = calculatePokemonStats({ baseStats: enemy.baseStats, level: enemy.level }).maxHp;

  function resolveAndApply(attackerMove: Move, attacker: DamageBattler, defender: DamageBattler): CalculateMoveDamageResult {
    return resolveAttackDamage(attackerMove, attacker, defender, rollDamageRandomFactor(randomSource), rollAccuracyCheck(randomSource), rollCriticalHit(randomSource));
  }

  function resolveConfirmedHit(attackerMove: Move, attacker: DamageBattler, defender: DamageBattler): CalculateMoveDamageResult {
    return resolveAttackDamage(attackerMove, attacker, defender, rollDamageRandomFactor(randomSource), undefined, rollCriticalHit(randomSource), true);
  }

  function applyMoveEffect(usedMove: Move, actor: BattleActor, result: CalculateMoveDamageResult, targetJustFainted: boolean): void {
    const effectTargetActor: BattleActor = usedMove.target === "self" ? actor : actor === "player" ? "enemy" : "player";
    const hit = result.kind !== "miss";
    const immuneToTarget = result.kind === "damage" && result.effectiveness === "none";
    const effectTargetFainted = effectTargetActor !== actor && targetJustFainted;
    const targetTypes = effectTargetActor === "player" ? player.types : enemy.types;

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
      if (effectTargetActor === "player") playerVolatile = volatileResult.updatedTargetVolatile;
      else wildVolatile = volatileResult.updatedTargetVolatile;
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
    if (effectTargetActor === "player") playerStages = effectResult.updatedStages;
    else wildStages = effectResult.updatedStages;

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
    return actor === "player" ? player.pokemonId : enemy.pokemonId;
  }

  function moveIdOf(actor: BattleActor): string {
    const chosen = actor === "player" ? player.moveId : enemy.moveId;
    const knownIds = actor === "player" ? player.knownMoveIds : enemy.knownMoveIds;
    const volatile = actor === "player" ? playerVolatile : wildVolatile;
    const usable = getUsableMoveIds(knownIds as string[], volatile);
    return usable.includes(chosen) ? chosen : usable[0];
  }

  function moveOf(actor: BattleActor): Move {
    const id = moveIdOf(actor);
    return getMoveById(id) ?? (actor === "player" ? playerMove : enemyMove);
  }

  function battlerOf(actor: BattleActor): DamageBattler {
    return actor === "player" ? playerBattler() : enemyBattler();
  }

  function setDamageOf(actor: BattleActor, damage: number): void {
    if (actor === "player") playerDamage = damage;
    else enemyDamage = damage;
  }

  function runMultiHitAttack(actor: BattleActor, move: Move, target: BattleActor): void {
    const attackerId = pokemonIdOf(actor);
    const usedMoveId = moveIdOf(actor);

    const firstResult = resolveAndApply(move, battlerOf(actor), battlerOf(target));

    if (isProtected(target === "player" ? playerVolatile : wildVolatile)) {
      events.push({ type: "protected", actor: target });
      setDamageOf(actor, 0);
      return;
    }

    if (firstResult.kind !== "damage") {
      if (firstResult.kind === "miss") events.push({ type: "move-missed", actor, pokemonId: attackerId, moveId: usedMoveId });
      setDamageOf(actor, 0);
      return;
    }

    if (move.effect.kind !== "multi-hit") return;

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
    applyMoveEffect(move, actor, firstResult, targetFainted);
  }

  function recordMoveUsage(actor: BattleActor, usedMoveId: string, isProtectMove: boolean): void {
    const current = actor === "player" ? playerVolatile : wildVolatile;
    const updated: VolatileState = { ...current, lastUsedMoveId: usedMoveId, protect: isProtectMove ? current.protect : undefined };
    if (actor === "player") playerVolatile = updated;
    else wildVolatile = updated;
  }

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
      if (actor === "player") playerVolatile = protectResult.updatedVolatile;
      else wildVolatile = protectResult.updatedVolatile;
      setDamageOf(actor, 0);
      return;
    }

    if (move.effect.kind === "heal") {
      events.push({ type: "move-used", actor, pokemonId: attackerId, moveId: usedMoveId });
      const healResult = resolveHealing({ currentHp: currentHpOf(actor), maxHp: maxHpOf(actor), healPercent: move.effect.healPercent });
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

    const result = resolveAndApply(move, battlerOf(actor), battlerOf(target));

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
      ...buildAttackEvents({ actor, attackerPokemonId: attackerId, defenderPokemonId: pokemonIdOf(target), moveId: usedMoveId, result, remainingDefenderHp: newTargetHp })
    );

    if (move.effect.kind === "drain" && actualDamageDealt > 0) {
      const drainResult = resolveDrainHealing({ actualDamageDealt, drainPercent: move.effect.drainPercent, currentHp: currentHpOf(actor), maxHp: maxHpOf(actor) });
      if (drainResult.healed > 0) {
        setHpOf(actor, drainResult.remainingHp);
        events.push({ type: "healed", actor, amount: drainResult.healed, remainingHp: drainResult.remainingHp, source: "drain" });
      }
    }

    if (move.effect.kind === "recoil" && actualDamageDealt > 0) {
      const recoilResult = resolveRecoilDamage({ actualDamageDealt, recoilPercent: move.effect.recoilPercent, currentHp: currentHpOf(actor) });
      setHpOf(actor, recoilResult.remainingHp);
      events.push({ type: "recoil-damage", actor, damage: recoilResult.damage, remainingHp: recoilResult.remainingHp });
      if (recoilResult.remainingHp <= 0) events.push({ type: "fainted", actor, pokemonId: attackerId });
    }

    applyMoveEffect(move, actor, result, newTargetHp <= 0);
  }

  function runActorTurn(actor: BattleActor): void {
    const isPlayerActor = actor === "player";
    const volatile = isPlayerActor ? playerVolatile : wildVolatile;

    if (resolvePreActionFlinch(volatile)) {
      const cleared: VolatileState = { ...volatile, flinch: false };
      if (isPlayerActor) playerVolatile = cleared;
      else wildVolatile = cleared;
      events.push({ type: "volatile-prevented-action", actor, condition: "flinch" });
      return;
    }

    const status = isPlayerActor ? playerStatus : wildStatus;
    const sleepTurnsRemaining = isPlayerActor ? playerStatusTurnsRemaining : wildStatusTurnsRemaining;

    const preAction = resolvePreActionStatus({ status, sleepTurnsRemaining, fullParalysisRoll: drawRoll, freezeThawRoll: drawRoll });

    if (isPlayerActor) {
      playerStatus = preAction.status;
      playerStatusTurnsRemaining = preAction.sleepTurnsRemaining;
    } else {
      wildStatus = preAction.status;
      wildStatusTurnsRemaining = preAction.sleepTurnsRemaining;
    }

    if (preAction.outcome === "fully-paralyzed" || preAction.outcome === "asleep" || preAction.outcome === "frozen") {
      events.push({
        type: "status-prevented-action",
        actor,
        status: preAction.outcome === "fully-paralyzed" ? "paralysis" : preAction.outcome === "asleep" ? "sleep" : "freeze",
      });
      return;
    }

    if (preAction.outcome === "woke-up") {
      events.push({ type: "status-recovered", actor, status: "sleep" });
      return;
    }

    if (preAction.outcome === "thawed") {
      events.push({ type: "status-recovered", actor, status: "freeze" });
    }

    const confusionResult = resolvePreActionConfusion({ confusion: (isPlayerActor ? playerVolatile : wildVolatile).confusion, selfHitRoll: drawRoll });

    if (confusionResult.outcome === "recovered") {
      const updated: VolatileState = { ...(isPlayerActor ? playerVolatile : wildVolatile), confusion: undefined };
      if (isPlayerActor) playerVolatile = updated;
      else wildVolatile = updated;
      events.push({ type: "volatile-recovered", actor, condition: "confusion" });
    } else if (confusionResult.outcome !== "not-confused") {
      const updated: VolatileState = { ...(isPlayerActor ? playerVolatile : wildVolatile), confusion: confusionResult.updatedConfusion };
      if (isPlayerActor) playerVolatile = updated;
      else wildVolatile = updated;

      if (confusionResult.outcome === "hurts-itself") {
        events.push({ type: "volatile-prevented-action", actor, condition: "confusion" });

        const battler = battlerOf(actor);
        const effectiveStats = applyStatStagesToStats(calculatePokemonStats({ baseStats: battler.baseStats, level: battler.level }), battler.stages);
        const selfDamage = resolveConfusionSelfDamage(battler.level, effectiveStats.attack, effectiveStats.defense, rollDamageRandomFactor(randomSource));

        const previousHp = currentHpOf(actor);
        const newHp = Math.max(0, previousHp - selfDamage);
        setHpOf(actor, newHp);
        events.push({ type: "confusion-self-damage", actor, damage: selfDamage, remainingHp: newHp });
        if (newHp <= 0) events.push({ type: "fainted", actor, pokemonId: pokemonIdOf(actor) });
        return;
      }
    }

    runAttack(actor);
  }

  const [firstActor, secondActor] = order;
  runActorTurn(firstActor);

  const secondActorOwnPokemonFainted = secondActor === "player" ? partyPokemonFainted : wildFainted;
  const firstActorOwnPokemonFainted = firstActor === "player" ? partyPokemonFainted : wildFainted;

  if (secondActorOwnPokemonFainted) {
    events.push(buildActionSkippedEvent(secondActor, "fainted-before-action"));
  } else if (firstActorOwnPokemonFainted) {
    events.push(buildActionSkippedEvent(secondActor, "no-valid-target"));
  } else {
    runActorTurn(secondActor);
  }

  if (!partyPokemonFainted) {
    const residual = resolveEndOfTurnStatusDamage(playerStatus, updatedPartyHp, playerMaxHp);
    if (residual) {
      updatedPartyHp = residual.remainingHp;
      partyPokemonFainted = updatedPartyHp <= 0;
      events.push({ type: "status-damage", actor: "player", status: playerStatus as "burn" | "poison", damage: residual.damage, remainingHp: updatedPartyHp });
      if (partyPokemonFainted) events.push({ type: "fainted", actor: "player", pokemonId: player.pokemonId });
    }
  }

  if (!wildFainted) {
    const residual = resolveEndOfTurnStatusDamage(wildStatus, updatedWildHp, wildMaxHp);
    if (residual) {
      updatedWildHp = residual.remainingHp;
      wildFainted = updatedWildHp <= 0;
      events.push({ type: "status-damage", actor: "enemy", status: wildStatus as "burn" | "poison", damage: residual.damage, remainingHp: updatedWildHp });
      if (wildFainted) events.push({ type: "fainted", actor: "enemy", pokemonId: enemy.pokemonId });
    }
  }

  if (!partyPokemonFainted) {
    const result = resolveEndOfTurnVolatile({ actor: "player", volatile: playerVolatile, currentHp: updatedPartyHp, maxHp: playerMaxHp, opponentFainted: wildFainted });
    playerVolatile = result.updatedVolatile;
    updatedPartyHp = result.updatedHp;
    partyPokemonFainted = result.fainted;
    events.push(...result.events);
    if (partyPokemonFainted) events.push({ type: "fainted", actor: "player", pokemonId: player.pokemonId });

    if (result.leechSeedDrainAmount > 0 && !wildFainted) {
      const healResult = resolveDrainHealing({ actualDamageDealt: result.leechSeedDrainAmount, drainPercent: 100, currentHp: updatedWildHp, maxHp: wildMaxHp });
      if (healResult.healed > 0) {
        updatedWildHp = healResult.remainingHp;
        events.push({ type: "healed", actor: "enemy", amount: healResult.healed, remainingHp: healResult.remainingHp, source: "drain" });
      }
    }
  }

  if (!wildFainted) {
    const result = resolveEndOfTurnVolatile({ actor: "enemy", volatile: wildVolatile, currentHp: updatedWildHp, maxHp: wildMaxHp, opponentFainted: partyPokemonFainted });
    wildVolatile = result.updatedVolatile;
    updatedWildHp = result.updatedHp;
    wildFainted = result.fainted;
    events.push(...result.events);
    if (wildFainted) events.push({ type: "fainted", actor: "enemy", pokemonId: enemy.pokemonId });

    if (result.leechSeedDrainAmount > 0 && !partyPokemonFainted) {
      const healResult = resolveDrainHealing({ actualDamageDealt: result.leechSeedDrainAmount, drainPercent: 100, currentHp: updatedPartyHp, maxHp: playerMaxHp });
      if (healResult.healed > 0) {
        updatedPartyHp = healResult.remainingHp;
        events.push({ type: "healed", actor: "player", amount: healResult.healed, remainingHp: healResult.remainingHp, source: "drain" });
      }
    }
  }

  if (playerVolatile.flinch) playerVolatile = { ...playerVolatile, flinch: false };
  if (wildVolatile.flinch) wildVolatile = { ...wildVolatile, flinch: false };

  return {
    player: {
      updatedHp: updatedPartyHp,
      fainted: partyPokemonFainted,
      damageDealt: playerDamage,
      status: playerStatus,
      statusTurnsRemaining: playerStatusTurnsRemaining,
      stages: playerStages,
      volatile: playerVolatile,
    },
    enemy: {
      updatedHp: updatedWildHp,
      fainted: wildFainted,
      damageDealt: enemyDamage,
      status: wildStatus,
      statusTurnsRemaining: wildStatusTurnsRemaining,
      stages: wildStages,
      volatile: wildVolatile,
    },
    events,
  };
}
