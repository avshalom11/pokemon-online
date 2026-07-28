import assert from "node:assert/strict";
import { test } from "node:test";

import { buildActionSkippedEvent, buildAttackEvents } from "./build-attack-events.ts";
import type { CalculateMoveDamageResult } from "@/engine/damage";

const NORMAL_HIT: CalculateMoveDamageResult = {
  kind: "damage",
  damage: 10,
  baseDamage: 10,
  randomFactor: 1,
  category: "physical",
  offensiveStat: "attack",
  defensiveStat: "defense",
  stabApplied: false,
  effectivenessMultiplier: 1,
  effectivenessResult: "normal",
  hit: true,
  accuracy: 100,
  accuracyRoll: 0,
  critical: false,
  criticalRoll: 0.5,
  effectiveness: "normal",
};

test("a normal hit produces move-used then damage-dealt, in order", () => {
  const events = buildAttackEvents({
    actor: "player",
    attackerPokemonId: "p1",
    defenderPokemonId: "wild",
    moveId: "scratch",
    result: NORMAL_HIT,
    remainingDefenderHp: 40,
  });

  assert.deepEqual(events, [
    { type: "move-used", actor: "player", pokemonId: "p1", moveId: "scratch" },
    { type: "damage-dealt", actor: "player", target: "enemy", damage: 10, remainingHp: 40 },
  ]);
});

test("a miss produces move-used then move-missed, never damage-dealt", () => {
  const missResult: CalculateMoveDamageResult = {
    kind: "miss",
    damage: 0,
    hit: false,
    accuracy: 70,
    accuracyRoll: 70,
    critical: false,
    effectiveness: "normal",
  };

  const events = buildAttackEvents({
    actor: "enemy",
    attackerPokemonId: "bulbasaur",
    defenderPokemonId: "p1",
    moveId: "tackle",
    result: missResult,
    remainingDefenderHp: 40,
  });

  assert.deepEqual(events, [
    { type: "move-used", actor: "enemy", pokemonId: "bulbasaur", moveId: "tackle" },
    { type: "move-missed", actor: "enemy", pokemonId: "bulbasaur", moveId: "tackle" },
  ]);
  assert.ok(!events.some((event) => event.type === "damage-dealt"));
});

test("a critical hit emits critical-hit before damage-dealt", () => {
  const critical: CalculateMoveDamageResult = { ...NORMAL_HIT, critical: true, damage: 15 };

  const events = buildAttackEvents({
    actor: "player",
    attackerPokemonId: "p1",
    defenderPokemonId: "wild",
    moveId: "scratch",
    result: critical,
    remainingDefenderHp: 30,
  });

  assert.deepEqual(
    events.map((e) => e.type),
    ["move-used", "critical-hit", "damage-dealt"]
  );
});

test("super-effective and not-very-effective both emit an effectiveness event before damage-dealt", () => {
  const superEffective: CalculateMoveDamageResult = { ...NORMAL_HIT, effectiveness: "super-effective" };
  const notVeryEffective: CalculateMoveDamageResult = { ...NORMAL_HIT, effectiveness: "not-very-effective" };

  for (const [result, expected] of [
    [superEffective, "super-effective"],
    [notVeryEffective, "not-very-effective"],
  ] as const) {
    const events = buildAttackEvents({
      actor: "player",
      attackerPokemonId: "p1",
      defenderPokemonId: "wild",
      moveId: "ember",
      result,
      remainingDefenderHp: 20,
    });
    assert.deepEqual(
      events.map((e) => e.type),
      ["move-used", "effectiveness", "damage-dealt"]
    );
    assert.equal((events[1] as { value: string }).value, expected);
  }
});

test("immunity emits effectiveness('none') and damage-dealt(0), never critical-hit", () => {
  const immune: CalculateMoveDamageResult = {
    ...NORMAL_HIT,
    critical: false,
    effectiveness: "none",
    damage: 0,
  };

  const events = buildAttackEvents({
    actor: "player",
    attackerPokemonId: "p1",
    defenderPokemonId: "wild",
    moveId: "tackle",
    result: immune,
    remainingDefenderHp: 40,
  });

  assert.deepEqual(events, [
    { type: "move-used", actor: "player", pokemonId: "p1", moveId: "tackle" },
    { type: "effectiveness", actor: "player", value: "none" },
    { type: "damage-dealt", actor: "player", target: "enemy", damage: 0, remainingHp: 40 },
  ]);
});

test("a lethal hit appends a fainted event for the defender after damage-dealt", () => {
  const events = buildAttackEvents({
    actor: "player",
    attackerPokemonId: "p1",
    defenderPokemonId: "bulbasaur",
    moveId: "scratch",
    result: { ...NORMAL_HIT, damage: 40 },
    remainingDefenderHp: 0,
  });

  assert.deepEqual(
    events.map((e) => e.type),
    ["move-used", "damage-dealt", "fainted"]
  );
  assert.deepEqual(events[2], { type: "fainted", actor: "enemy", pokemonId: "bulbasaur" });
});

test("a status move produces only move-used", () => {
  const events = buildAttackEvents({
    actor: "player",
    attackerPokemonId: "p1",
    defenderPokemonId: "wild",
    moveId: "growl",
    result: { kind: "non-damaging", damage: 0, reason: "status-move" },
    remainingDefenderHp: 40,
  });

  assert.deepEqual(events, [{ type: "move-used", actor: "player", pokemonId: "p1", moveId: "growl" }]);
});

test("buildActionSkippedEvent produces a single action-skipped event", () => {
  assert.deepEqual(buildActionSkippedEvent("enemy", "fainted-before-action"), {
    type: "action-skipped",
    actor: "enemy",
    reason: "fainted-before-action",
  });
});

test("buildActionSkippedEvent also supports the no-valid-target reason", () => {
  assert.deepEqual(buildActionSkippedEvent("player", "no-valid-target"), {
    type: "action-skipped",
    actor: "player",
    reason: "no-valid-target",
  });
});
