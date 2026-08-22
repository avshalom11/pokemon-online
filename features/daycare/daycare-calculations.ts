import {
  DAYCARE_MAX_LEVELS_PER_STAY,
  DAYCARE_MAX_POKEMON_LEVEL,
  DAYCARE_MS_PER_HOUR,
  getDaycareCostForNextLevel,
  getDaycareHoursForNextLevel,
} from "./config/daycare.config";

// POKÉMON DAYCARE — PHASE 1. Pure, framework-free progress math — no
// React, no Prisma, no "server-only" (mirrors features/pokemon-progression/
// pokemon-progression-calculations.ts's own split between pure formulas
// and the server-only service that persists their results).

export type DaycareStoppedReason = "levelCap" | "maxLevel" | null;

export interface DaycareProgress {
  // How many levels this stay has earned so far, 0-10.
  earnedLevels: number;
  // startingLevel + earnedLevels, capped at DAYCARE_MAX_POKEMON_LEVEL —
  // "level after pickup" if collected right now.
  effectiveLevel: number;
  // Total Money owed for every completed level so far — the sum of
  // getDaycareCostForNextLevel(level) across each level step actually
  // earned. Never exceeds whatever the 10-level/level-100 cap allows.
  debt: number;
  // True once EITHER cap (10 earned levels, or level 100) has been
  // reached — progression (both earned levels and debt) is then
  // permanently stopped for the rest of this stay.
  progressionStopped: boolean;
  stoppedReason: DaycareStoppedReason;
  // The real-world instant the NEXT level will be earned — null once
  // progressionStopped is true (there is no next level to wait for).
  nextLevelDueAt: Date | null;
  // Milliseconds remaining until nextLevelDueAt, clamped to >= 0 — null
  // under the same condition as nextLevelDueAt. Display-only: the actual
  // authoritative moment a level is earned is this function's own next
  // execution against real elapsed time, never a client countdown
  // reaching zero.
  msUntilNextLevel: number | null;
}

export interface CalculateDaycareProgressParams {
  startingLevel: number;
  depositedAt: Date;
  now: Date;
}

// THE one place Daycare progress is ever derived. Deterministic by
// construction: given the same (startingLevel, depositedAt, now), this
// always returns the exact same result — repeated calls (a refreshed page,
// a background poll, a pickup transaction reading it a second time) can
// never grant extra levels, since nothing here depends on how many times
// it has previously been called, only on real elapsed wall-clock time.
//
// Walks forward one level step at a time (never a single averaged/blended
// rate for the whole stay), consuming exactly the real hours
// getDaycareHoursForNextLevel(level) requires for each step — this is what
// makes "the timing must be evaluated PER LEVEL STEP" (crossing from the
// 1-10 bracket into the 11-25 bracket mid-stay, for example) correct
// automatically, with no separate cross-bracket special case. The loop
// runs at most DAYCARE_MAX_LEVELS_PER_STAY (10) iterations — cheap
// regardless of how long the Pokémon has actually been deposited, even
// years — since it stops the instant either cap is reached.
export function calculateDaycareProgress(params: CalculateDaycareProgressParams): DaycareProgress {
  const { startingLevel, depositedAt, now } = params;

  let level = Math.max(1, Math.min(DAYCARE_MAX_POKEMON_LEVEL, Math.floor(startingLevel)));
  let earnedLevels = 0;
  let debt = 0;
  let cursorMs = depositedAt.getTime();
  const nowMs = now.getTime();

  while (earnedLevels < DAYCARE_MAX_LEVELS_PER_STAY && level < DAYCARE_MAX_POKEMON_LEVEL) {
    const msNeededForStep = getDaycareHoursForNextLevel(level) * DAYCARE_MS_PER_HOUR;
    if (cursorMs + msNeededForStep > nowMs) break;

    debt += getDaycareCostForNextLevel(level);
    cursorMs += msNeededForStep;
    level += 1;
    earnedLevels += 1;
  }

  const stoppedReason: DaycareStoppedReason =
    level >= DAYCARE_MAX_POKEMON_LEVEL ? "maxLevel" : earnedLevels >= DAYCARE_MAX_LEVELS_PER_STAY ? "levelCap" : null;

  if (stoppedReason !== null) {
    return { earnedLevels, effectiveLevel: level, debt, progressionStopped: true, stoppedReason, nextLevelDueAt: null, msUntilNextLevel: null };
  }

  const dueMs = cursorMs + getDaycareHoursForNextLevel(level) * DAYCARE_MS_PER_HOUR;

  return {
    earnedLevels,
    effectiveLevel: level,
    debt,
    progressionStopped: false,
    stoppedReason: null,
    nextLevelDueAt: new Date(dueMs),
    msUntilNextLevel: Math.max(0, dueMs - nowMs),
  };
}
