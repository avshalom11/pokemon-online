import { WILD_LEVEL_BRACKETS } from "./wild-level-brackets.config";

export interface WildLevelRange {
  minimumLevel: number;
  maximumLevel: number;
}

// Never below 1, and never a fractional/NaN player level reaching the
// bracket scan below — same defensive-clamp precedent
// pokemon-stat-calculations.ts's safeLevel already establishes for wild/
// owned-Pokémon levels.
function safePlayerLevel(playerLevel: number): number {
  if (!Number.isFinite(playerLevel)) return 1;
  return Math.max(1, Math.floor(playerLevel));
}

// The one place a player level is ever turned into a wild-level range —
// every bracket in WILD_LEVEL_BRACKETS is checked in order, and the last
// (open-ended) bracket always matches once a player level exceeds every
// maxPlayerLevel before it, so this never falls through without a match.
export function getWildLevelRangeForPlayerLevel(playerLevel: number): WildLevelRange {
  const level = safePlayerLevel(playerLevel);

  const bracket =
    WILD_LEVEL_BRACKETS.find(
      (candidate) => level >= candidate.minPlayerLevel && (candidate.maxPlayerLevel === undefined || level <= candidate.maxPlayerLevel)
    ) ?? WILD_LEVEL_BRACKETS[WILD_LEVEL_BRACKETS.length - 1];

  return { minimumLevel: bracket.minimumWildLevel, maximumLevel: bracket.maximumWildLevel };
}
