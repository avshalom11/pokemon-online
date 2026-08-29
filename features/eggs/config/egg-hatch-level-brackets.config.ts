import { safePlayerLevel } from "@/engine/player-level-scaling/wild-level-bracket-lookup";

// EGG HATCH REBALANCE — the ONLY place player-level -> egg-hatch-level
// brackets are defined, same "one dedicated tuning file, nothing else
// hardcodes the numbers" convention engine/player-level-scaling/
// wild-level-brackets.config.ts already established for wild-encounter
// brackets. Change the ranges here to rebalance egg hatch levels; nothing
// else in this module (or its callers) needs to change.
//
// Deliberately a SEPARATE table from WILD_LEVEL_BRACKETS — approved egg
// hatch ranges run noticeably higher than wild-encounter ranges at every
// player level (e.g. player 1-5: wild 1-7 vs hatch 5-11), so this is never
// derived from the wild table via an offset/multiplier.
//
// Brackets are checked in order by getHatchLevelRangeForPlayerLevel below
// and are contiguous/non-overlapping by construction: every player level
// from 1 upward falls in exactly one bracket. The last bracket is
// deliberately open-ended (no maxPlayerLevel) — "56 and above" all share
// the same hatch range rather than needing an ever-growing tail of new
// brackets — same shape WILD_LEVEL_BRACKETS' own last bracket already uses.
export interface EggHatchLevelBracket {
  minPlayerLevel: number;
  // Omitted only on the last bracket — see this file's own doc comment.
  maxPlayerLevel?: number;
  minimumHatchLevel: number;
  maximumHatchLevel: number;
}

export const EGG_HATCH_LEVEL_BRACKETS: EggHatchLevelBracket[] = [
  { minPlayerLevel: 1, maxPlayerLevel: 5, minimumHatchLevel: 5, maximumHatchLevel: 11 },
  { minPlayerLevel: 6, maxPlayerLevel: 10, minimumHatchLevel: 9, maximumHatchLevel: 17 },
  { minPlayerLevel: 11, maxPlayerLevel: 15, minimumHatchLevel: 13, maximumHatchLevel: 23 },
  { minPlayerLevel: 16, maxPlayerLevel: 20, minimumHatchLevel: 17, maximumHatchLevel: 29 },
  { minPlayerLevel: 21, maxPlayerLevel: 25, minimumHatchLevel: 21, maximumHatchLevel: 35 },
  { minPlayerLevel: 26, maxPlayerLevel: 30, minimumHatchLevel: 25, maximumHatchLevel: 41 },
  { minPlayerLevel: 31, maxPlayerLevel: 35, minimumHatchLevel: 29, maximumHatchLevel: 47 },
  { minPlayerLevel: 36, maxPlayerLevel: 40, minimumHatchLevel: 33, maximumHatchLevel: 53 },
  { minPlayerLevel: 41, maxPlayerLevel: 45, minimumHatchLevel: 37, maximumHatchLevel: 59 },
  { minPlayerLevel: 46, maxPlayerLevel: 50, minimumHatchLevel: 41, maximumHatchLevel: 65 },
  { minPlayerLevel: 51, maxPlayerLevel: 55, minimumHatchLevel: 45, maximumHatchLevel: 70 },
  { minPlayerLevel: 56, minimumHatchLevel: 47, maximumHatchLevel: 73 },
];

export interface HatchLevelRange {
  minimumLevel: number;
  maximumLevel: number;
}

// The one place a player level is ever turned into an egg-hatch-level
// range — every bracket in EGG_HATCH_LEVEL_BRACKETS is checked in order,
// and the last (open-ended) bracket always matches once a player level
// exceeds every maxPlayerLevel before it, so this never falls through
// without a match. Reuses safePlayerLevel (engine/player-level-scaling/
// wild-level-bracket-lookup.ts) rather than duplicating the same
// never-below-1/never-fractional clamp a second time.
export function getHatchLevelRangeForPlayerLevel(playerLevel: number): HatchLevelRange {
  const level = safePlayerLevel(playerLevel);

  const bracket =
    EGG_HATCH_LEVEL_BRACKETS.find(
      (candidate) => level >= candidate.minPlayerLevel && (candidate.maxPlayerLevel === undefined || level <= candidate.maxPlayerLevel)
    ) ?? EGG_HATCH_LEVEL_BRACKETS[EGG_HATCH_LEVEL_BRACKETS.length - 1];

  return { minimumLevel: bracket.minimumHatchLevel, maximumLevel: bracket.maximumHatchLevel };
}
