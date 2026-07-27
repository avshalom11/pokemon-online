import assert from "node:assert/strict";
import { test } from "node:test";

import { TYPE_CHART, calculateTypeEffectiveness } from "./type-chart.ts";
import type { MoveType } from "../moves/index.ts";

// Pure unit tests for the Phase 5D canonical Type Chart — the one and only
// effectiveness table for the whole project (see this file's own doc
// comment in type-chart.ts for why the old data/battle/type-chart.ts is
// never touched or imported here).

const ALL_18_TYPES: readonly MoveType[] = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

test("the canonical Type Chart has an entry for every one of the 18 registered Pokémon types", () => {
  for (const type of ALL_18_TYPES) {
    assert.ok(type in TYPE_CHART, `TYPE_CHART is missing an entry for "${type}"`);
  }
  assert.equal(Object.keys(TYPE_CHART).length, ALL_18_TYPES.length);
});

test("every bucket in every Type Chart entry only ever references real, known types", () => {
  const knownTypes = new Set(ALL_18_TYPES);

  for (const [attackType, matchups] of Object.entries(TYPE_CHART)) {
    for (const bucket of [matchups.superEffectiveAgainst, matchups.notEffectiveAgainst, matchups.noEffectAgainst]) {
      for (const defenderType of bucket) {
        assert.ok(knownTypes.has(defenderType), `${attackType}'s chart references unknown type "${defenderType}"`);
      }
    }
  }
});

test("Fire -> Grass is super-effective (2x)", () => {
  const result = calculateTypeEffectiveness("fire", ["grass"]);
  assert.deepEqual(result, { multiplier: 2, result: "super-effective" });
});

test("Fire -> Water is not-very-effective (0.5x)", () => {
  const result = calculateTypeEffectiveness("fire", ["water"]);
  assert.deepEqual(result, { multiplier: 0.5, result: "not-very-effective" });
});

test("Water -> Fire is super-effective (2x)", () => {
  const result = calculateTypeEffectiveness("water", ["fire"]);
  assert.deepEqual(result, { multiplier: 2, result: "super-effective" });
});

test("Electric -> Water is super-effective (2x)", () => {
  const result = calculateTypeEffectiveness("electric", ["water"]);
  assert.deepEqual(result, { multiplier: 2, result: "super-effective" });
});

test("Electric -> Ground is a complete immunity (0x)", () => {
  const result = calculateTypeEffectiveness("electric", ["ground"]);
  assert.deepEqual(result, { multiplier: 0, result: "immune" });
});

test("Ground -> Flying is a complete immunity (0x)", () => {
  const result = calculateTypeEffectiveness("ground", ["flying"]);
  assert.deepEqual(result, { multiplier: 0, result: "immune" });
});

test("Normal -> Ghost is a complete immunity (0x)", () => {
  const result = calculateTypeEffectiveness("normal", ["ghost"]);
  assert.deepEqual(result, { multiplier: 0, result: "immune" });
});

test("Ghost -> Normal is a complete immunity (0x)", () => {
  const result = calculateTypeEffectiveness("ghost", ["normal"]);
  assert.deepEqual(result, { multiplier: 0, result: "immune" });
});

test("Fire -> Grass/Steel dual-type stacks to 4x (2x * 2x)", () => {
  const result = calculateTypeEffectiveness("fire", ["grass", "steel"]);
  assert.deepEqual(result, { multiplier: 4, result: "super-effective" });
});

test("Fire -> Water/Dragon dual-type stacks to 0.25x (0.5x * 0.5x)", () => {
  const result = calculateTypeEffectiveness("fire", ["water", "dragon"]);
  assert.deepEqual(result, { multiplier: 0.25, result: "not-very-effective" });
});

test("a neutral matchup (Normal -> Water) is exactly 1x", () => {
  const result = calculateTypeEffectiveness("normal", ["water"]);
  assert.deepEqual(result, { multiplier: 1, result: "normal" });
});

test("an empty defenderTypes list reduces to the neutral identity (1x, normal)", () => {
  const result = calculateTypeEffectiveness("fire", []);
  assert.deepEqual(result, { multiplier: 1, result: "normal" });
});

test("dual-type stacking multiplies rather than adds (sanity check against a naive sum)", () => {
  const result = calculateTypeEffectiveness("water", ["dragon", "water"]);
  // 0.5 * 0.5 = 0.25, never 0.5 + 0.5 = 1 or any other combination.
  assert.equal(result.multiplier, 0.25);
});

test("an unknown attack type fails loudly rather than silently assuming Normal", () => {
  assert.throws(() => calculateTypeEffectiveness("not-a-real-type" as MoveType, ["grass"]));
});

test("an unknown defender type fails loudly rather than silently assuming Normal", () => {
  assert.throws(() => calculateTypeEffectiveness("fire", ["not-a-real-type" as MoveType]));
});
