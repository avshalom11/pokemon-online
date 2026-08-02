// Phase 1 — Wild Pokémon level scaling. The ONLY place player-level ->
// wild-level brackets are defined, same "one dedicated tuning file, nothing
// else hardcodes the numbers" convention data/encounter/rarity-config.ts
// already established for rarity probabilities. Change the ranges here to
// rebalance wild encounters; nothing else in this module (or its callers)
// needs to change.
//
// Brackets are checked in order by wild-level-bracket-lookup.ts and are
// contiguous/non-overlapping by construction: every player level from 1
// upward falls in exactly one bracket. The last bracket is deliberately
// open-ended (no maxPlayerLevel) — "56 and above" all share the same wild
// range rather than needing an ever-growing tail of new brackets.
export interface WildLevelBracket {
  minPlayerLevel: number;
  // Omitted only on the last bracket — see this file's own doc comment.
  maxPlayerLevel?: number;
  minimumWildLevel: number;
  maximumWildLevel: number;
}

export const WILD_LEVEL_BRACKETS: WildLevelBracket[] = [
  { minPlayerLevel: 1, maxPlayerLevel: 5, minimumWildLevel: 1, maximumWildLevel: 7 },
  { minPlayerLevel: 6, maxPlayerLevel: 10, minimumWildLevel: 5, maximumWildLevel: 12 },
  { minPlayerLevel: 11, maxPlayerLevel: 15, minimumWildLevel: 9, maximumWildLevel: 17 },
  { minPlayerLevel: 16, maxPlayerLevel: 20, minimumWildLevel: 13, maximumWildLevel: 22 },
  { minPlayerLevel: 21, maxPlayerLevel: 25, minimumWildLevel: 18, maximumWildLevel: 27 },
  { minPlayerLevel: 26, maxPlayerLevel: 30, minimumWildLevel: 23, maximumWildLevel: 32 },
  { minPlayerLevel: 31, maxPlayerLevel: 35, minimumWildLevel: 28, maximumWildLevel: 37 },
  { minPlayerLevel: 36, maxPlayerLevel: 40, minimumWildLevel: 33, maximumWildLevel: 42 },
  { minPlayerLevel: 41, maxPlayerLevel: 45, minimumWildLevel: 38, maximumWildLevel: 47 },
  { minPlayerLevel: 46, maxPlayerLevel: 50, minimumWildLevel: 43, maximumWildLevel: 52 },
  { minPlayerLevel: 51, maxPlayerLevel: 55, minimumWildLevel: 48, maximumWildLevel: 57 },
  { minPlayerLevel: 56, minimumWildLevel: 53, maximumWildLevel: 60 },
];
