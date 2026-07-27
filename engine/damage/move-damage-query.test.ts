import assert from "node:assert/strict";
import { test } from "node:test";

import { UnknownMoveError, calculateMoveDamageById } from "./move-damage-query.ts";

// Uses real, populated Generation 1 move data from the current Move
// Registry (not the old data/moves/move-data.ts catalog) to prove the
// adapter maps registry metadata into the pure engine correctly.

test("a physical move resolved by id (Pound) uses Attack/Defense and matches the hand-computed formula", () => {
  const result = calculateMoveDamageById({
    moveId: "pound",
    level: 50,
    attackerStats: { attack: 50, specialAttack: 999 },
    defenderStats: { defense: 50, specialDefense: 999 },
    randomFactor: 1.0,
  });

  assert.deepEqual(result, {
    kind: "damage",
    damage: 19,
    baseDamage: 19,
    randomFactor: 1.0,
    category: "physical",
    offensiveStat: "attack",
    defensiveStat: "defense",
    stabApplied: false,
    effectivenessMultiplier: 1,
    effectivenessResult: "normal",
  });
});

test("a Normal-type move (Pound) resolved by id receives STAB when attackerTypes includes Normal", () => {
  const withoutStab = calculateMoveDamageById({
    moveId: "pound",
    level: 50,
    attackerStats: { attack: 50, specialAttack: 999 },
    defenderStats: { defense: 50, specialDefense: 999 },
    randomFactor: 1.0,
  });
  const withStab = calculateMoveDamageById({
    moveId: "pound",
    level: 50,
    attackerStats: { attack: 50, specialAttack: 999 },
    defenderStats: { defense: 50, specialDefense: 999 },
    randomFactor: 1.0,
    attackerTypes: ["normal"],
  });

  assert.ok(withoutStab.kind === "damage" && withStab.kind === "damage");
  assert.equal(withoutStab.stabApplied, false);
  assert.equal(withStab.stabApplied, true);
  assert.equal(withStab.damage, Math.floor(withoutStab.damage * 1.5));
});

test("a special move resolved by id (Thunderbolt) uses Special Attack/Special Defense", () => {
  const result = calculateMoveDamageById({
    moveId: "thunderbolt",
    level: 50,
    attackerStats: { attack: 999, specialAttack: 100 },
    defenderStats: { defense: 999, specialDefense: 50 },
    randomFactor: 1.0,
  });

  assert.equal(result.kind, "damage");
  assert.equal(result.kind === "damage" && result.offensiveStat, "specialAttack");
  assert.equal(result.kind === "damage" && result.defensiveStat, "specialDefense");
  assert.equal(result.kind === "damage" && result.baseDamage, 81);
});

test("a status move resolved by id (Growl) returns a non-damaging result, not an error", () => {
  const result = calculateMoveDamageById({
    moveId: "growl",
    level: 50,
    attackerStats: { attack: 50, specialAttack: 50 },
    defenderStats: { defense: 50, specialDefense: 50 },
    randomFactor: 1.0,
  });

  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "status-move" });
});

test("an unknown moveId throws UnknownMoveError", () => {
  assert.throws(
    () =>
      calculateMoveDamageById({
        moveId: "not-a-real-move",
        level: 50,
        attackerStats: { attack: 50, specialAttack: 50 },
        defenderStats: { defense: 50, specialDefense: 50 },
        randomFactor: 1.0,
      }),
    UnknownMoveError
  );
});
