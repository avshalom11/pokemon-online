import { safePlayerLevel, type WildLevelRange } from "./wild-level-bracket-lookup";
import type { WildLevelBracket } from "./wild-level-brackets.config";

// LEGENDARY ENCOUNTER LEVELS. A SEPARATE player-level -> wild-level table,
// used ONLY once a species with PokemonSpecies.rarity === "legendary" has
// already been selected by the normal encounter pipeline (rarity chance,
// rarity weights, zone encounter weights, and species selection itself are
// all completely untouched by this file — see pokemon-encounter-engine.ts's
// own startPokemonEncounter, the one place this is read). Deliberately a
// second, independent bracket table rather than a modifier applied to
// WILD_LEVEL_BRACKETS (wild-level-brackets.config.ts): a legendary starts
// noticeably ABOVE the normal range for a low-level player (15-20 vs. the
// normal 1-7 at player 1-5) and gradually converges into the same
// ballpark as the normal top bracket by player 56+ (53-60, identical to
// WILD_LEVEL_BRACKETS' own last bracket) — a relationship that doesn't
// reduce to a simple offset/multiplier of the normal table, so it's
// tuned here directly instead.
//
// Same "contiguous, non-overlapping, last bracket open-ended" shape and
// WildLevelBracket type as WILD_LEVEL_BRACKETS — reused, not duplicated,
// so getLegendaryWildLevelRangeForPlayerLevel below can share
// wild-level-bracket-lookup.ts's own bracket-scan logic and player-level
// clamp exactly.
export const LEGENDARY_WILD_LEVEL_BRACKETS: WildLevelBracket[] = [
  { minPlayerLevel: 1, maxPlayerLevel: 5, minimumWildLevel: 15, maximumWildLevel: 20 },
  { minPlayerLevel: 6, maxPlayerLevel: 10, minimumWildLevel: 15, maximumWildLevel: 22 },
  { minPlayerLevel: 11, maxPlayerLevel: 15, minimumWildLevel: 17, maximumWildLevel: 25 },
  { minPlayerLevel: 16, maxPlayerLevel: 20, minimumWildLevel: 20, maximumWildLevel: 28 },
  { minPlayerLevel: 21, maxPlayerLevel: 25, minimumWildLevel: 23, maximumWildLevel: 31 },
  { minPlayerLevel: 26, maxPlayerLevel: 30, minimumWildLevel: 27, maximumWildLevel: 35 },
  { minPlayerLevel: 31, maxPlayerLevel: 35, minimumWildLevel: 31, maximumWildLevel: 39 },
  { minPlayerLevel: 36, maxPlayerLevel: 40, minimumWildLevel: 35, maximumWildLevel: 43 },
  { minPlayerLevel: 41, maxPlayerLevel: 45, minimumWildLevel: 40, maximumWildLevel: 48 },
  { minPlayerLevel: 46, maxPlayerLevel: 50, minimumWildLevel: 44, maximumWildLevel: 53 },
  { minPlayerLevel: 51, maxPlayerLevel: 55, minimumWildLevel: 49, maximumWildLevel: 58 },
  { minPlayerLevel: 56, minimumWildLevel: 53, maximumWildLevel: 60 },
];

// The one place a player level is ever turned into a LEGENDARY wild-level
// range — mirrors getWildLevelRangeForPlayerLevel's own bracket-scan
// exactly (same clamp, same "last bracket always matches" guarantee), just
// scanning LEGENDARY_WILD_LEVEL_BRACKETS instead. Never consulted for
// species selection/eligibility (that already happened, unchanged, before
// this is ever called) — purely a post-selection level override.
export function getLegendaryWildLevelRangeForPlayerLevel(playerLevel: number): WildLevelRange {
  const level = safePlayerLevel(playerLevel);

  const bracket =
    LEGENDARY_WILD_LEVEL_BRACKETS.find(
      (candidate) => level >= candidate.minPlayerLevel && (candidate.maxPlayerLevel === undefined || level <= candidate.maxPlayerLevel)
    ) ?? LEGENDARY_WILD_LEVEL_BRACKETS[LEGENDARY_WILD_LEVEL_BRACKETS.length - 1];

  return { minimumLevel: bracket.minimumWildLevel, maximumLevel: bracket.maximumWildLevel };
}
