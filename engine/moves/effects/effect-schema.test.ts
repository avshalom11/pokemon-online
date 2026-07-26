import assert from "node:assert/strict";
import { test } from "node:test";

import { moveEffectSchema, statStageChangeSchema } from "./effect-schema.ts";

test("accepts a plain damage effect", () => {
  assert.equal(moveEffectSchema.safeParse({ kind: "damage" }).success, true);
});

test("accepts a damage-with-status-chance effect", () => {
  const result = moveEffectSchema.safeParse({
    kind: "damage-with-status-chance",
    status: "burn",
    chancePercent: 10,
  });
  assert.equal(result.success, true);
});

test("rejects a damage-with-status-chance effect missing chancePercent", () => {
  const result = moveEffectSchema.safeParse({ kind: "damage-with-status-chance", status: "burn" });
  assert.equal(result.success, false);
});

test("rejects a damage-with-status-chance effect with an unknown status", () => {
  const result = moveEffectSchema.safeParse({
    kind: "damage-with-status-chance",
    status: "cursed",
    chancePercent: 10,
  });
  assert.equal(result.success, false);
});

test("accepts a stat-change effect with at least one change", () => {
  const result = moveEffectSchema.safeParse({
    kind: "stat-change",
    changes: [{ stat: "speed", stages: 1 }],
  });
  assert.equal(result.success, true);
});

test("rejects a stat-change effect with an empty changes list", () => {
  const result = moveEffectSchema.safeParse({ kind: "stat-change", changes: [] });
  assert.equal(result.success, false);
});

test("rejects a stat stage change beyond +/-6", () => {
  assert.equal(statStageChangeSchema.safeParse({ stat: "attack", stages: 7 }).success, false);
  assert.equal(statStageChangeSchema.safeParse({ stat: "attack", stages: -7 }).success, false);
});

test("accepts a heal effect between 1 and 100 percent", () => {
  assert.equal(moveEffectSchema.safeParse({ kind: "heal", healPercent: 50 }).success, true);
});

test("rejects a heal effect over 100 percent", () => {
  assert.equal(moveEffectSchema.safeParse({ kind: "heal", healPercent: 150 }).success, false);
});

test("accepts both fixed-damage bases", () => {
  assert.equal(
    moveEffectSchema.safeParse({ kind: "fixed-damage", damage: { basis: "level" } }).success,
    true
  );
  assert.equal(
    moveEffectSchema.safeParse({ kind: "fixed-damage", damage: { basis: "set-amount", amount: 20 } })
      .success,
    true
  );
});

test("rejects a fixed-damage set-amount of 0", () => {
  const result = moveEffectSchema.safeParse({
    kind: "fixed-damage",
    damage: { basis: "set-amount", amount: 0 },
  });
  assert.equal(result.success, false);
});

test("accepts a valid multi-hit range", () => {
  assert.equal(moveEffectSchema.safeParse({ kind: "multi-hit", minHits: 2, maxHits: 5 }).success, true);
});

test("rejects a multi-hit range where maxHits < minHits", () => {
  const result = moveEffectSchema.safeParse({ kind: "multi-hit", minHits: 5, maxHits: 2 });
  assert.equal(result.success, false);
});

test("rejects a multi-hit range below 2 hits", () => {
  const result = moveEffectSchema.safeParse({ kind: "multi-hit", minHits: 1, maxHits: 3 });
  assert.equal(result.success, false);
});

test("accepts ohko, copy-move, and transform with no extra fields", () => {
  assert.equal(moveEffectSchema.safeParse({ kind: "ohko" }).success, true);
  assert.equal(moveEffectSchema.safeParse({ kind: "copy-move" }).success, true);
  assert.equal(moveEffectSchema.safeParse({ kind: "transform" }).success, true);
});

test("accepts a status effect", () => {
  assert.equal(moveEffectSchema.safeParse({ kind: "status", status: "paralysis" }).success, true);
});

test("rejects an effect with an unrecognized kind", () => {
  assert.equal(moveEffectSchema.safeParse({ kind: "curse" }).success, false);
});
