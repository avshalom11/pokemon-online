import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveEndOfTurnVolatile } from "./resolve-end-of-turn-volatile";

test("Leech Seed damages the seeded side and reports the actual amount to heal the opponent by", () => {
  const result = resolveEndOfTurnVolatile({
    actor: "player",
    volatile: { leechSeed: { source: "enemy" } },
    currentHp: 100,
    maxHp: 100,
    opponentFainted: false,
  });

  assert.equal(result.updatedHp, 100 - Math.floor(100 / 8));
  assert.equal(result.leechSeedDrainAmount, Math.floor(100 / 8));
  assert.ok(result.events.some((event) => event.type === "leech-seed-damage"));
});

test("Leech Seed can faint the seeded Pokémon", () => {
  const result = resolveEndOfTurnVolatile({
    actor: "player",
    volatile: { leechSeed: { source: "enemy" } },
    currentHp: 1,
    maxHp: 100,
    opponentFainted: false,
  });

  assert.equal(result.updatedHp, 0);
  assert.equal(result.fainted, true);
  assert.equal(result.leechSeedDrainAmount, 1);
});

test("trapping deals residual damage and expires after its duration runs out", () => {
  const almostDone = resolveEndOfTurnVolatile({
    actor: "enemy",
    volatile: { trapping: { source: "player", turnsRemaining: 1 } },
    currentHp: 1000,
    maxHp: 1000,
    opponentFainted: false,
  });

  assert.equal(almostDone.updatedVolatile.trapping, undefined);
  assert.ok(almostDone.events.some((event) => event.type === "trapping-damage"));
  assert.ok(almostDone.events.some((event) => event.type === "volatile-ended" && event.condition === "trapping"));
});

test("trapping never leaves an invalid permanent trap once its own source has fainted", () => {
  const result = resolveEndOfTurnVolatile({
    actor: "enemy",
    volatile: { trapping: { source: "player", turnsRemaining: 4 } },
    currentHp: 1000,
    maxHp: 1000,
    opponentFainted: true,
  });

  assert.equal(result.updatedVolatile.trapping, undefined);
  assert.equal(result.updatedHp, 1000, "no residual damage ticks once the trap's own source is gone");
  assert.ok(result.events.some((event) => event.type === "volatile-ended" && event.condition === "trapping"));
});
