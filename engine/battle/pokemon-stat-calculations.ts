import type { PokemonBaseStats } from "@/shared/types/pokemon";

// Centralized Pokémon battle-stat math (Phase 2) — the only place HP/
// Attack/Defense/Special Attack/Special Defense/Speed are ever derived from
// a species' base stats and a level. Every consumer (owned-Pokémon
// hydration, wild encounters, the battle engine, healing, HP sync, the My
// Pokémon details panel) must call through here rather than reimplementing
// the formula. No IVs/EVs/Nature yet — see CalculatePokemonStatsInput's own
// doc comment for how those slot in later without a rewrite.

export interface PokemonStats {
  maxHp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

// Object-input shape (rather than positional baseStats/level args) so a
// later phase can add optional ivs/evs/nature fields here without changing
// every call site's signature — see calculatePokemonStats below.
export interface CalculatePokemonStatsInput {
  baseStats: PokemonBaseStats;
  level: number;
}

// Kept in sync with features/pokemon-progression/pokemon-progression-config.ts's
// MAX_POKEMON_LEVEL (same value, 100) — not imported directly because
// engine/ never depends on features/ (the reverse dependency direction is
// the established one throughout this codebase).
const MAX_POKEMON_LEVEL = 100;

const STAT_LEVEL_MULTIPLIER = 2;
const STAT_LEVEL_DIVISOR = 100;
const HP_FLAT_BONUS = 10;
const NON_HP_FLAT_BONUS = 5;

function safeLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(MAX_POKEMON_LEVEL, Math.floor(level)));
}

// Base stats are catalog data (always positive in practice), but this
// guards against a corrupt/missing value degrading to a minimal stat
// instead of ever producing NaN/Infinity/a non-positive calculated stat.
function safeBaseStat(baseStat: number): number {
  return Number.isFinite(baseStat) && baseStat > 0 ? Math.floor(baseStat) : 1;
}

// MaxHP = floor((2 × BaseHP × Level) / 100) + Level + 10
export function calculatePokemonHpStat(baseHp: number, level: number): number {
  const lvl = safeLevel(level);
  const base = safeBaseStat(baseHp);
  const growth = Math.floor((STAT_LEVEL_MULTIPLIER * base * lvl) / STAT_LEVEL_DIVISOR);

  return growth + lvl + HP_FLAT_BONUS;
}

// Stat = floor((2 × BaseStat × Level) / 100) + 5 — applied independently to
// Attack, Defense, Special Attack, Special Defense, and Speed.
export function calculatePokemonNonHpStat(baseStat: number, level: number): number {
  const lvl = safeLevel(level);
  const base = safeBaseStat(baseStat);
  const growth = Math.floor((STAT_LEVEL_MULTIPLIER * base * lvl) / STAT_LEVEL_DIVISOR);

  return growth + NON_HP_FLAT_BONUS;
}

export function calculatePokemonStats({ baseStats, level }: CalculatePokemonStatsInput): PokemonStats {
  return {
    maxHp: calculatePokemonHpStat(baseStats.health, level),
    attack: calculatePokemonNonHpStat(baseStats.attack, level),
    defense: calculatePokemonNonHpStat(baseStats.defense, level),
    specialAttack: calculatePokemonNonHpStat(baseStats.specialAttack, level),
    specialDefense: calculatePokemonNonHpStat(baseStats.specialDefense, level),
    speed: calculatePokemonNonHpStat(baseStats.speed, level),
  };
}

export interface ApplyLevelUpToCurrentHpParams {
  previousCurrentHp: number;
  previousMaxHp: number;
  newMaxHp: number;
}

// The one centralized rule for how current HP changes on a level-up: gains
// exactly the amount maxHp grew by, never fully heals, and a fainted
// Pokémon (0 HP) stays fainted. Reused by every level-up write path instead
// of being reimplemented inline (see pokemon-progression-service.ts's
// applyPokemonXpGrant, the only place PlayerPokemon.level is ever written).
export function applyLevelUpToCurrentHp({ previousCurrentHp, previousMaxHp, newMaxHp }: ApplyLevelUpToCurrentHpParams): number {
  if (previousCurrentHp <= 0) return 0;

  const grown = previousCurrentHp + Math.max(0, newMaxHp - previousMaxHp);

  return Math.max(0, Math.min(newMaxHp, grown));
}
