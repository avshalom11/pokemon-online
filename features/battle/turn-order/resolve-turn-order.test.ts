import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveTurnOrder, rollTurnOrderTieBreak } from "./resolve-turn-order.ts";

const ZERO_PRIORITY_PLAYER = { actor: "player" as const, priority: 0 };
const ZERO_PRIORITY_ENEMY = { actor: "enemy" as const, priority: 0 };

test("higher Speed acts first when priorities are equal (fast player)", () => {
  const order = resolveTurnOrder({
    playerAction: ZERO_PRIORITY_PLAYER,
    enemyAction: ZERO_PRIORITY_ENEMY,
    playerSpeed: 90,
    enemySpeed: 50,
    tieBreakRoll: 0.5,
  });
  assert.deepEqual(order, ["player", "enemy"]);
});

test("higher Speed acts first when priorities are equal (fast enemy)", () => {
  const order = resolveTurnOrder({
    playerAction: ZERO_PRIORITY_PLAYER,
    enemyAction: ZERO_PRIORITY_ENEMY,
    playerSpeed: 45,
    enemySpeed: 80,
    tieBreakRoll: 0.5,
  });
  assert.deepEqual(order, ["enemy", "player"]);
});

test("a higher-priority move acts first even if its user is slower (Quick Attack example)", () => {
  const order = resolveTurnOrder({
    playerAction: { actor: "player", priority: 1 }, // e.g. Quick Attack
    enemyAction: { actor: "enemy", priority: 0 }, // e.g. Tackle
    playerSpeed: 10,
    enemySpeed: 999,
    tieBreakRoll: 0.99,
  });
  assert.deepEqual(order, ["player", "enemy"]);
});

test("a lower-priority move acts second even if its user is faster", () => {
  const order = resolveTurnOrder({
    playerAction: { actor: "player", priority: 0 },
    enemyAction: { actor: "enemy", priority: 1 },
    playerSpeed: 999,
    enemySpeed: 10,
    tieBreakRoll: 0.01,
  });
  assert.deepEqual(order, ["enemy", "player"]);
});

test("equal priority and equal Speed uses the injected tie-break (< 0.5 -> player first)", () => {
  const order = resolveTurnOrder({
    playerAction: ZERO_PRIORITY_PLAYER,
    enemyAction: ZERO_PRIORITY_ENEMY,
    playerSpeed: 50,
    enemySpeed: 50,
    tieBreakRoll: 0.2,
  });
  assert.deepEqual(order, ["player", "enemy"]);
});

test("equal priority and equal Speed uses the injected tie-break (>= 0.5 -> enemy first)", () => {
  const order = resolveTurnOrder({
    playerAction: ZERO_PRIORITY_PLAYER,
    enemyAction: ZERO_PRIORITY_ENEMY,
    playerSpeed: 50,
    enemySpeed: 50,
    tieBreakRoll: 0.5,
  });
  assert.deepEqual(order, ["enemy", "player"]);
});

test("rollTurnOrderTieBreak passes the raw random() value straight through", () => {
  assert.equal(rollTurnOrderTieBreak(() => 0.42), 0.42);
});

test("rollTurnOrderTieBreak defaults to Math.random and stays within [0, 1)", () => {
  const roll = rollTurnOrderTieBreak();
  assert.ok(roll >= 0);
  assert.ok(roll < 1);
});
