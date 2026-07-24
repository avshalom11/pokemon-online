import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyLevelUpToCurrentHp,
  calculatePokemonHpStat,
  calculatePokemonNonHpStat,
  calculatePokemonStats,
} from "./pokemon-stat-calculations.ts";
import type { PokemonBaseStats } from "@/shared/types/pokemon";

const PIKACHU_BASE_STATS: PokemonBaseStats = {
  health: 35,
  attack: 55,
  defense: 40,
  specialAttack: 50,
  specialDefense: 50,
  speed: 90,
};

const ALL_STAT_KEYS = ["maxHp", "attack", "defense", "specialAttack", "specialDefense", "speed"] as const;

// --- Growth shape ---------------------------------------------------------

test("every stat is higher at level 20 than at level 5, same species", () => {
  const low = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 5 });
  const high = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 20 });

  for (const key of ALL_STAT_KEYS) {
    assert.ok(high[key] > low[key], `${key}: expected level 20 (${high[key]}) > level 5 (${low[key]})`);
  }
});

test("every stat is higher at level 22 than at level 20, same species", () => {
  const level20 = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 20 });
  const level22 = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 22 });

  for (const key of ALL_STAT_KEYS) {
    assert.ok(level22[key] > level20[key], `${key}: expected level 22 (${level22[key]}) > level 20 (${level20[key]})`);
  }
});

test("the level 20 -> 22 increase is smaller than the total level 5 -> 20 increase", () => {
  const level5 = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 5 });
  const level20 = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 20 });
  const level22 = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 22 });

  for (const key of ALL_STAT_KEYS) {
    const bigJump = level20[key] - level5[key];
    const smallJump = level22[key] - level20[key];
    assert.ok(smallJump < bigJump, `${key}: expected 20->22 jump (${smallJump}) < 5->20 jump (${bigJump})`);
  }
});

// --- Base-stat identity ----------------------------------------------------

test("a higher species Base Attack produces a higher calculated Attack at the same level", () => {
  const low = calculatePokemonNonHpStat(40, 20);
  const high = calculatePokemonNonHpStat(80, 20);
  assert.ok(high > low);
});

test("a higher species Base Speed produces a higher calculated Speed at the same level", () => {
  const slow = calculatePokemonNonHpStat(30, 20);
  const fast = calculatePokemonNonHpStat(90, 20);
  assert.ok(fast > slow);
});

// --- Formula shape ----------------------------------------------------------

test("HP uses the HP formula: floor((2 * base * level) / 100) + level + 10", () => {
  assert.equal(calculatePokemonHpStat(35, 5), Math.floor((2 * 35 * 5) / 100) + 5 + 10);
  assert.equal(calculatePokemonHpStat(60, 37), Math.floor((2 * 60 * 37) / 100) + 37 + 10);
});

test("non-HP stats use the non-HP formula: floor((2 * base * level) / 100) + 5", () => {
  assert.equal(calculatePokemonNonHpStat(55, 5), Math.floor((2 * 55 * 5) / 100) + 5);
  assert.equal(calculatePokemonNonHpStat(90, 37), Math.floor((2 * 90 * 37) / 100) + 5);
});

// --- Edge levels -------------------------------------------------------------

test("level 1 returns valid positive integer stats", () => {
  const stats = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 1 });
  for (const key of ALL_STAT_KEYS) {
    assert.ok(Number.isInteger(stats[key]));
    assert.ok(stats[key] > 0);
  }
});

test("the maximum level (100) returns valid finite integer stats", () => {
  const stats = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 100 });
  for (const key of ALL_STAT_KEYS) {
    assert.ok(Number.isFinite(stats[key]));
    assert.ok(Number.isInteger(stats[key]));
    assert.ok(stats[key] > 0);
  }
});

test("invalid levels are safely clamped rather than producing NaN/Infinity/non-positive stats", () => {
  const zero = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 0 });
  const negative = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: -5 });
  const level1 = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 1 });
  const tooHigh = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 9999 });
  const level100 = calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 100 });

  // Level 0 and negative levels are never applied as-is — they clamp up to
  // the minimum valid level (1), never silently allowed through.
  assert.deepEqual(zero, level1);
  assert.deepEqual(negative, level1);
  // A level above the game's cap clamps down to MAX_POKEMON_LEVEL (100).
  assert.deepEqual(tooHigh, level100);

  for (const key of ALL_STAT_KEYS) {
    assert.ok(Number.isFinite(zero[key]) && zero[key] > 0);
  }
});

// --- Concrete Pikachu values -------------------------------------------------

test("Pikachu's calculated stats at level 5 match the expected values", () => {
  assert.deepEqual(calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 5 }), {
    maxHp: 18,
    attack: 10,
    defense: 9,
    specialAttack: 10,
    specialDefense: 10,
    speed: 14,
  });
});

test("Pikachu's calculated stats at level 20 match the expected values", () => {
  assert.deepEqual(calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 20 }), {
    maxHp: 44,
    attack: 27,
    defense: 21,
    specialAttack: 25,
    specialDefense: 25,
    speed: 41,
  });
});

test("Pikachu's calculated stats at level 22 match the expected values", () => {
  assert.deepEqual(calculatePokemonStats({ baseStats: PIKACHU_BASE_STATS, level: 22 }), {
    maxHp: 47,
    attack: 29,
    defense: 22,
    specialAttack: 27,
    specialDefense: 27,
    speed: 44,
  });
});

// --- Level-up current-HP rule ------------------------------------------------

test("current HP increases by exactly the max-HP increase after a level-up", () => {
  // Spec example: 20/25 -> new max 28 -> new current 23.
  const newCurrentHp = applyLevelUpToCurrentHp({ previousCurrentHp: 20, previousMaxHp: 25, newMaxHp: 28 });
  assert.equal(newCurrentHp, 23);
});

test("a fainted Pokemon (0 HP) remains at 0 HP after a level-up", () => {
  const newCurrentHp = applyLevelUpToCurrentHp({ previousCurrentHp: 0, previousMaxHp: 25, newMaxHp: 40 });
  assert.equal(newCurrentHp, 0);
});

test("current HP never exceeds the new max HP", () => {
  // A deliberately inconsistent previousCurrentHp (above previousMaxHp) must
  // still clamp to the new max rather than overflow past it.
  const newCurrentHp = applyLevelUpToCurrentHp({ previousCurrentHp: 1000, previousMaxHp: 25, newMaxHp: 28 });
  assert.equal(newCurrentHp, 28);

  // A normal full-HP Pokemon growing to a new max lands exactly on it, never past it.
  const fullHp = applyLevelUpToCurrentHp({ previousCurrentHp: 25, previousMaxHp: 25, newMaxHp: 28 });
  assert.equal(fullHp, 28);
});

test("no level change (previousMaxHp === newMaxHp) leaves current HP unchanged", () => {
  const newCurrentHp = applyLevelUpToCurrentHp({ previousCurrentHp: 17, previousMaxHp: 25, newMaxHp: 25 });
  assert.equal(newCurrentHp, 17);
});
