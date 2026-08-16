import "server-only";

import {
  getHighestUnlockedBracketIndex,
  getUnlockedWildLevelBrackets,
  getWildLevelRangeForBracketIndex,
  isBracketIndexUnlocked,
  type WildLevelRange,
} from "@/engine/player-level-scaling/wild-level-bracket-lookup";
import { prisma } from "@/lib/db/prisma";

// MAP — SELECTABLE WILD LEVEL RANGE. One unlocked bracket as the UI needs
// it — plain fields (never the raw WildLevelBracket/index pair) so
// features/player/components/WildLevelBracketSelector.tsx never needs to
// import the engine's own types directly.
export interface UnlockedBracketOption {
  index: number;
  minimumWildLevel: number;
  maximumWildLevel: number;
  minPlayerLevel: number;
  maxPlayerLevel?: number;
}

export interface WildLevelBracketPreferenceView {
  playerLevel: number;
  selectedIndex: number;
  selectedRange: WildLevelRange;
  unlocked: UnlockedBracketOption[];
}

function toOption({ index, bracket }: { index: number; bracket: { minimumWildLevel: number; maximumWildLevel: number; minPlayerLevel: number; maxPlayerLevel?: number } }): UnlockedBracketOption {
  return {
    index,
    minimumWildLevel: bracket.minimumWildLevel,
    maximumWildLevel: bracket.maximumWildLevel,
    minPlayerLevel: bracket.minPlayerLevel,
    maxPlayerLevel: bracket.maxPlayerLevel,
  };
}

// The one read path both the Map page (for the selector's own options/
// current value) and the encounter path (resolveEffectiveWildLevelRange
// below) go through. Never trusts the stored selectedWildLevelBracketIndex
// as-is: re-validates it against the player's CURRENT level every time
// (isBracketIndexUnlocked) and silently falls back to the highest
// currently-unlocked bracket whenever it's null, out of bounds, or no
// longer unlocked (e.g. WILD_LEVEL_BRACKETS was rebalanced after this
// value was saved) — per this feature's own "safely fall back" requirement.
// Never writes anything back itself; a stale stored value is corrected the
// next time the player actually picks something (setWildLevelBracketPreference).
export async function getWildLevelBracketPreference(playerId: string): Promise<WildLevelBracketPreferenceView> {
  const profile = await prisma.playerProfile.findUniqueOrThrow({
    where: { id: playerId },
    select: { level: true, selectedWildLevelBracketIndex: true },
  });

  const storedIndex = profile.selectedWildLevelBracketIndex;
  const selectedIndex =
    storedIndex !== null && isBracketIndexUnlocked(storedIndex, profile.level)
      ? storedIndex
      : getHighestUnlockedBracketIndex(profile.level);

  return {
    playerLevel: profile.level,
    selectedIndex,
    // Non-null: selectedIndex is always either the validated stored index
    // (already confirmed unlocked, therefore a real in-bounds bracket) or
    // getHighestUnlockedBracketIndex's own result (always a real bracket —
    // see that function's own doc comment).
    selectedRange: getWildLevelRangeForBracketIndex(selectedIndex)!,
    unlocked: getUnlockedWildLevelBrackets(profile.level).map(toOption),
  };
}

// The one write path — SERVER-SIDE validated against the player's CURRENT
// level, never trusting the client's own belief about which brackets are
// unlocked. Rejects (never clamps/downgrades-and-saves) both an
// out-of-bounds index and an in-bounds-but-still-locked one — e.g. a
// level-10 player requesting index 11 (53–60) is rejected outright, the
// same "verify, don't trust" rule this feature's own spec requires.
export type SetWildLevelBracketResult =
  | { status: "success"; selectedIndex: number; selectedRange: WildLevelRange }
  | { status: "invalid-index" }
  | { status: "locked" };

export async function setWildLevelBracketPreference(playerId: string, requestedIndex: number): Promise<SetWildLevelBracketResult> {
  if (!Number.isInteger(requestedIndex)) {
    return { status: "invalid-index" };
  }

  const requestedRange = getWildLevelRangeForBracketIndex(requestedIndex);
  if (!requestedRange) {
    return { status: "invalid-index" };
  }

  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: playerId }, select: { level: true } });

  if (!isBracketIndexUnlocked(requestedIndex, profile.level)) {
    return { status: "locked" };
  }

  await prisma.playerProfile.update({
    where: { id: playerId },
    data: { selectedWildLevelBracketIndex: requestedIndex },
  });

  return { status: "success", selectedIndex: requestedIndex, selectedRange: requestedRange };
}

// The one place the encounter path (features/battle-session/services/
// battle-session.service.ts) reads the effective wild-level range from —
// trimmed to just the range, going through the exact same validate-and-
// fall-back rule as getWildLevelBracketPreference above (this function
// simply reuses it), so an encounter can never be scaled to a stale or
// no-longer-unlocked bracket even if the player's own level changed since
// they last picked one.
export async function resolveEffectiveWildLevelRange(playerId: string): Promise<WildLevelRange> {
  const { selectedRange } = await getWildLevelBracketPreference(playerId);
  return selectedRange;
}
