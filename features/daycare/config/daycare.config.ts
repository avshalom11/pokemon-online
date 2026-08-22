import { MAX_POKEMON_LEVEL } from "@/features/pokemon-progression/pokemon-progression-config";

// POKÉMON DAYCARE — PHASE 1. The single source of truth for every tunable
// number this feature uses — the two hard caps, the timing brackets, and
// the cost brackets. Every consumer (daycare-calculations.ts's pure
// progress math, the service layer, the /daycare UI's own rules table)
// reads through these exports rather than hardcoding any of these numbers
// a second time.

// Reuses the SAME level-100 cap the rest of the game already enforces
// (pokemon-progression-config.ts) — Daycare never invents its own,
// independent notion of "max level."
export const DAYCARE_MAX_POKEMON_LEVEL = MAX_POKEMON_LEVEL;

// At most this many levels may be earned in a single Daycare stay,
// regardless of how much real time passes beyond that point — see
// calculateDaycareProgress's own doc comment (daycare-calculations.ts) for
// how progression (both earned levels AND debt) stops completely once
// this is reached.
export const DAYCARE_MAX_LEVELS_PER_STAY = 10;

// PHASE 2 — 5 SLOTS. The maximum number of Pokémon one player may have
// deposited in the Daycare AT ONCE — each with its own fully independent
// depositedAt/startingLevel/progress/debt (see PlayerDaycareStay's own doc
// comment in prisma/schema.prisma for how this is enforced race-safely at
// the service layer, since it's no longer a plain database unique
// constraint the way Phase 1's single-slot limit was). Never hardcode `5`
// anywhere else — every check (depositToDaycare's own capacity guard, the
// /daycare page's "X/5" display and empty-slot rendering) reads this one
// constant.
export const DAYCARE_MAX_SLOTS = 5;

// PHASE 2 — DEPOSIT FEE. A flat, immediate Money charge taken the instant
// a Pokémon is deposited — completely separate from, and paid before, the
// per-level Daycare debt that Pokémon then starts accumulating (Section 2
// of this task's own spec: "This is separate from level debt"). Never
// refunded on pickup, and never persisted per-stay (it's always this same
// constant, so there is nothing stay-specific to remember beyond "the fee
// was already paid at deposit time" — the UI shows this same constant
// directly rather than reading a stored value).
export const DAYCARE_DEPOSIT_FEE = 500;

export const DAYCARE_MS_PER_HOUR = 60 * 60 * 1000;

// How often the /daycare page's client re-fetches authoritative Daycare
// state in the background, purely so a deposited Pokémon's earned-levels/
// debt/countdown stay current without requiring a manual refresh — the
// SERVER remains the only source that ever actually grants a level (this
// poll only ever re-reads what calculateDaycareProgress already
// deterministically derives, never advances anything itself). A much
// slower cadence than Global Chat/Friends' ~2.5s polls is deliberate:
// Daycare progress moves in hours, not seconds, so anything faster would
// just be wasted reads — this matches PresenceHeartbeat's own 30s
// cadence, the next-lightest existing polling precedent in this app.
export const DAYCARE_VIEW_POLL_INTERVAL_MS = 30_000;

interface DaycareBracket {
  maxLevel: number;
}

// TIMING — real-world hours one level-up step takes, keyed by the level
// being REACHED (not the level leaving). Example: the 10 -> 11 step is
// governed by the "11-25" bracket (12h), not the "1-10" bracket (8h) the
// departing level 10 itself sits in — see getDaycareHoursForNextLevel.
// Ordered ascending by maxLevel; the last entry's Infinity is what covers
// every level 36 and up.
const DAYCARE_TIMING_BRACKETS: ReadonlyArray<DaycareBracket & { hours: number }> = [
  { maxLevel: 10, hours: 8 },
  { maxLevel: 25, hours: 12 },
  { maxLevel: 35, hours: 24 },
  { maxLevel: Infinity, hours: 48 },
];

// COST — Money owed per level-up step, keyed the same way (by the level
// being REACHED) as the timing brackets above — see
// getDaycareCostForNextLevel. Note the bracket boundaries past level 35
// differ from the timing table (cost splits 36-50 / 51-100; timing treats
// all of 36+ the same) — two genuinely independent tables, never derived
// from one another.
const DAYCARE_COST_BRACKETS: ReadonlyArray<DaycareBracket & { cost: number }> = [
  { maxLevel: 10, cost: 300 },
  { maxLevel: 25, cost: 500 },
  { maxLevel: 35, cost: 800 },
  { maxLevel: 50, cost: 1200 },
  { maxLevel: Infinity, cost: 1500 },
];

function findBracket<T extends DaycareBracket>(brackets: ReadonlyArray<T>, nextLevel: number): T {
  return brackets.find((entry) => nextLevel <= entry.maxLevel) ?? brackets[brackets.length - 1];
}

// Real hours required for the step FROM `currentLevel` TO `currentLevel +
// 1` — determined by which bracket `currentLevel + 1` (the level being
// reached) falls into. Example: getDaycareHoursForNextLevel(10) === 12
// (the 10 -> 11 step is governed by the 11-25 bracket, since 11 is the
// level being reached), never 8 (the bracket level 10 itself belongs to).
export function getDaycareHoursForNextLevel(currentLevel: number): number {
  return findBracket(DAYCARE_TIMING_BRACKETS, currentLevel + 1).hours;
}

// Money owed for the step FROM `currentLevel` TO `currentLevel + 1` — same
// "keyed by the level being reached" rule as the timing helper above.
// Example: getDaycareCostForNextLevel(9) === 300 (level 10 is being
// reached, still within the 1-10 bracket); getDaycareCostForNextLevel(10)
// === 500 (level 11 is being reached, the 11-25 bracket).
export function getDaycareCostForNextLevel(currentLevel: number): number {
  return findBracket(DAYCARE_COST_BRACKETS, currentLevel + 1).cost;
}

// Exposed as plain, read-only data for the UI's own rules table (Section
// 14) — never a second, independently-typed copy of these numbers; the
// component maps directly over these same arrays.
export function getDaycareTimingBrackets(): ReadonlyArray<{ maxLevel: number; hours: number }> {
  return DAYCARE_TIMING_BRACKETS;
}

export function getDaycareCostBrackets(): ReadonlyArray<{ maxLevel: number; cost: number }> {
  return DAYCARE_COST_BRACKETS;
}
