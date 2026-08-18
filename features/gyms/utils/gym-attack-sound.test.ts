// ATTACK SOUND (GYM BATTLE POLISH task, section 3/5) — focused coverage
// for decideAttackSoundsForTurn's own pure decision logic (the actual
// Audio playback side effect lives in the already-existing, reused
// features/battle/utils/battle-attack-effect.ts and is exercised via
// source-inspection in gym-battle-audio-wiring.test.ts, since this project
// has no React-render test harness).
import assert from "node:assert/strict";
import { test } from "node:test";

import type { BattleEvent } from "@/features/battle/events/battle-event.types";
import { decideAttackSoundsForTurn } from "./gym-attack-sound";

function moveUsed(actor: "player" | "enemy"): BattleEvent {
  return { type: "move-used", actor, pokemonId: `${actor}-mon`, moveId: "scratch" };
}

function actionSkipped(actor: "player" | "enemy"): BattleEvent {
  return { type: "action-skipped", actor, reason: "fainted-before-action" };
}

test("player attack (move-used, actor player) is detected", () => {
  const decision = decideAttackSoundsForTurn([moveUsed("player")]);
  assert.deepEqual(decision, { playerAttacked: true, enemyAttacked: false });
});

test("NPC attack (move-used, actor enemy) is detected", () => {
  const decision = decideAttackSoundsForTurn([moveUsed("enemy")]);
  assert.deepEqual(decision, { playerAttacked: false, enemyAttacked: true });
});

test("a normal turn where both sides actually attacked reports both", () => {
  const decision = decideAttackSoundsForTurn([moveUsed("player"), { type: "damage-dealt", actor: "player", target: "enemy", damage: 10, remainingHp: 90 }, moveUsed("enemy")]);
  assert.deepEqual(decision, { playerAttacked: true, enemyAttacked: true });
});

// A miss is still an attack attempt — "move-used" is emitted regardless of
// hit/miss (move-missed is a separate, additional event) — the sound
// represents the attack ACTION, not specifically a successful hit.
test("a missed attack still counts as an attack (move-used is present even on a miss)", () => {
  const decision = decideAttackSoundsForTurn([moveUsed("player"), { type: "move-missed", actor: "player", pokemonId: "p1", moveId: "scratch" }]);
  assert.deepEqual(decision, { playerAttacked: true, enemyAttacked: false });
});

// Do not fake an NPC sound if the NPC did not attack (section 5's own
// explicit rule) — an actor whose action was skipped entirely (e.g. its
// own Pokémon fainted before it could act) never counts as having
// attacked, even though the OTHER side clearly did.
test("a skipped action (fainted-before-action) never counts as an attack for that side", () => {
  const decision = decideAttackSoundsForTurn([moveUsed("player"), actionSkipped("enemy")]);
  assert.deepEqual(decision, { playerAttacked: true, enemyAttacked: false });
});

test("no events at all reports neither side as having attacked", () => {
  assert.deepEqual(decideAttackSoundsForTurn([]), { playerAttacked: false, enemyAttacked: false });
});
