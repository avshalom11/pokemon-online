import { WILD_LEVEL_BRACKETS, type WildLevelBracket } from "./wild-level-brackets.config";

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

// MAP — SELECTABLE WILD LEVEL RANGE. Every bracket a player of this level
// has "unlocked" — i.e. every bracket up to and including their own current
// one (WILD_LEVEL_BRACKETS is contiguous/non-overlapping by construction —
// see that file's own doc comment — so "unlocked" is exactly "minPlayerLevel
// already reached", never a separate progression flag). Index is the
// bracket's own position in WILD_LEVEL_BRACKETS — the same index the
// player's persisted selection (PlayerProfile.selectedWildLevelBracketIndex)
// stores, so a caller never has to re-derive or duplicate this ordering.
export interface UnlockedWildLevelBracket {
  index: number;
  bracket: WildLevelBracket;
}

export function getUnlockedWildLevelBrackets(playerLevel: number): UnlockedWildLevelBracket[] {
  const level = safePlayerLevel(playerLevel);
  return WILD_LEVEL_BRACKETS.reduce<UnlockedWildLevelBracket[]>((unlocked, bracket, index) => {
    if (bracket.minPlayerLevel <= level) unlocked.push({ index, bracket });
    return unlocked;
  }, []);
}

// The highest unlocked bracket's own index — i.e. the bracket that exactly
// matches getWildLevelRangeForPlayerLevel's own result above, expressed as
// an index instead of a range. This is the DEFAULT selection for a player
// who has never chosen one (see this feature's own "preserves current
// gameplay behavior" requirement) and the fallback for an invalid/stale
// stored selection.
export function getHighestUnlockedBracketIndex(playerLevel: number): number {
  const unlocked = getUnlockedWildLevelBrackets(playerLevel);
  // Always non-empty: the first bracket's minPlayerLevel is 1 and
  // safePlayerLevel never returns below 1, so at least that one bracket is
  // always unlocked.
  return unlocked[unlocked.length - 1].index;
}

// True only for an index that is BOTH a real bracket (in bounds) AND
// currently unlocked for this exact player level — the one check every
// write (setWildLevelBracketPreference) and every read-time re-validation
// (resolveEffectiveWildLevelRange) goes through, so a stale or manually-
// crafted higher index can never be honored server-side.
export function isBracketIndexUnlocked(index: number, playerLevel: number): boolean {
  const bracket = WILD_LEVEL_BRACKETS[index];
  if (!bracket) return false;
  return bracket.minPlayerLevel <= safePlayerLevel(playerLevel);
}

// Bounds-checked range lookup by bracket index — returns null (never
// throws) for an out-of-range index, so callers can treat "not a real
// bracket" uniformly with "not unlocked" rather than needing a try/catch.
export function getWildLevelRangeForBracketIndex(index: number): WildLevelRange | null {
  const bracket = WILD_LEVEL_BRACKETS[index];
  if (!bracket) return null;
  return { minimumLevel: bracket.minimumWildLevel, maximumLevel: bracket.maximumWildLevel };
}
