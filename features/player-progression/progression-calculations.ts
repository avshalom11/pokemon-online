import {
  CAPTURE_XP_BASE,
  CAPTURE_XP_PER_LEVEL,
  VICTORY_XP_BASE,
  VICTORY_XP_PER_LEVEL,
  XP_PER_LEVEL,
} from "./progression-config.ts";
import type { LevelUpResult, PlayerProgress } from "./progression-types";

// Pure, framework-free player-progression math — no React, no Prisma, no
// "server-only" (mirrors features/party/utils/party-rules.ts and
// engine/battle/capture.ts's split between pure formulas and the
// server-only service that persists their results).

function safeLevel(level: number): number {
  return Math.max(1, Math.floor(level));
}

function safeTotalXp(totalXp: number): number {
  return Math.max(0, Math.floor(totalXp));
}

// XP required to advance from `level` to `level + 1`.
export function getXpRequiredForNextLevel(level: number): number {
  return safeLevel(level) * XP_PER_LEVEL;
}

// Total accumulated XP at which `level` begins (level 1 begins at 0).
// Closed-form sum of getXpRequiredForNextLevel(1..level-1) — kept in sync
// with that single formula via XP_PER_LEVEL rather than duplicating it.
export function getTotalXpRequiredForLevel(level: number): number {
  const n = safeLevel(level);
  return (XP_PER_LEVEL * (n - 1) * n) / 2;
}

// Inverts getTotalXpRequiredForLevel. Uses the closed-form quadratic
// inverse (not an unbounded loop from level 1) so it stays cheap even for
// very large XP totals, then applies a small bounded correction for
// floating-point rounding at the boundary.
export function calculateLevelFromTotalXp(totalXp: number): number {
  const xp = safeTotalXp(totalXp);
  const estimate = Math.floor((1 + Math.sqrt(1 + (8 * xp) / XP_PER_LEVEL)) / 2);
  let level = Math.max(1, estimate);

  while (getTotalXpRequiredForLevel(level + 1) <= xp) level++;
  while (level > 1 && getTotalXpRequiredForLevel(level) > xp) level--;

  return level;
}

// The single place total XP is turned into "what the player sees" — level,
// and progress *within* the current level (not total lifetime XP).
export function getPlayerProgress(totalXp: number): PlayerProgress {
  const xp = safeTotalXp(totalXp);
  const level = calculateLevelFromTotalXp(xp);
  const levelStartXp = getTotalXpRequiredForLevel(level);

  return {
    level,
    totalXp: xp,
    currentLevelXp: xp - levelStartXp,
    xpRequiredForNextLevel: getXpRequiredForNextLevel(level),
  };
}

// Reshapes a reward action's response (addPlayerExperience's LevelUpResult)
// into the exact same point-in-time snapshot shape getPlayerProgress
// returns (renames newLevel -> level, drops the delta-only fields) — never
// recomputes anything from the XP curve, just renaming/selecting fields
// that are already authoritative. This is what lets the header's shared
// client-side progression state (features/player/context/
// player-progression-context.tsx) accept a battle reward's response with
// the same code path as a fresh server fetch, instead of the battle UI
// reshaping it inline.
export function progressFromLevelUpResult(result: LevelUpResult): PlayerProgress {
  return {
    level: result.newLevel,
    totalXp: result.totalXp,
    currentLevelXp: result.currentLevelXp,
    xpRequiredForNextLevel: result.xpRequiredForNextLevel,
  };
}

// Player XP reward for defeating a wild Pokémon of `wildLevel`. Rounded —
// VICTORY_XP_PER_LEVEL is a non-integer (see progression-config.ts's own
// doc comment on why), so an odd wildLevel would otherwise produce a
// fractional XP amount; addPlayerExperience always persists a whole number.
export function calculateVictoryXpReward(wildLevel: number): number {
  return Math.round(VICTORY_XP_BASE + safeLevel(wildLevel) * VICTORY_XP_PER_LEVEL);
}

// Player XP reward for successfully capturing a wild Pokémon of `wildLevel`.
export function calculateCaptureXpReward(wildLevel: number): number {
  return CAPTURE_XP_BASE + safeLevel(wildLevel) * CAPTURE_XP_PER_LEVEL;
}
