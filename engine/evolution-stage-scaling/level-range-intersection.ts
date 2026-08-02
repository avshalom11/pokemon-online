import type { WildLevelRange } from "@/engine/player-level-scaling/wild-level-bracket-lookup";

// Generic inclusive-range overlap — the one place two WildLevelRanges are
// ever intersected, shared by every eligibility check and final-level roll
// in this module. Returns null (never a range with minimumLevel >
// maximumLevel) when the two ranges don't overlap at all, so callers can
// branch on "is there any legal level here" with a single null check.
export function intersectLevelRanges(a: WildLevelRange, b: WildLevelRange): WildLevelRange | null {
  const minimumLevel = Math.max(a.minimumLevel, b.minimumLevel);
  const maximumLevel = Math.min(a.maximumLevel, b.maximumLevel);

  return minimumLevel <= maximumLevel ? { minimumLevel, maximumLevel } : null;
}
