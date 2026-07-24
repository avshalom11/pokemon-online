import {
  BASE_POKEMON_XP_MULTIPLIER,
  LEVEL_DIFFERENCE_MULTIPLIER_STEP,
  MAX_LEVEL_MULTIPLIER,
  MAX_POKEMON_LEVEL,
  MIN_LEVEL_MULTIPLIER,
  POKEMON_XP_OTHER_PARTICIPANTS_SHARE,
  XP_PER_POKEMON_LEVEL,
} from "./pokemon-progression-config.ts";
import type { BattleParticipantRecord, PokemonProgress, PokemonXpShare } from "./pokemon-progression-types";

// Pure, framework-free owned-Pokémon progression math — no React, no
// Prisma, no "server-only" (mirrors features/player-progression/
// progression-calculations.ts's own split between pure formulas and the
// server-only service that persists their results).

function safeLevel(level: number): number {
  return Math.max(1, Math.min(MAX_POKEMON_LEVEL, Math.floor(level)));
}

function safeTotalXp(totalXp: number): number {
  return Math.max(0, Math.floor(totalXp));
}

// XP required to advance from `level` to `level + 1`. 0 at (or above) the
// level cap — there is no next level to require XP for.
export function getXpRequiredForNextPokemonLevel(level: number): number {
  const lvl = safeLevel(level);
  if (lvl >= MAX_POKEMON_LEVEL) return 0;
  return lvl * XP_PER_POKEMON_LEVEL;
}

// Total accumulated XP at which `level` begins (level 1 begins at 0).
// Closed-form sum of getXpRequiredForNextPokemonLevel(1..level-1) — kept in
// sync with that single formula via XP_PER_POKEMON_LEVEL rather than
// duplicating it.
export function getTotalXpRequiredForPokemonLevel(level: number): number {
  const n = safeLevel(level);
  return (XP_PER_POKEMON_LEVEL * (n - 1) * n) / 2;
}

// Inverts getTotalXpRequiredForPokemonLevel, capped at MAX_POKEMON_LEVEL —
// closed-form quadratic inverse (not an unbounded loop from level 1) so it
// stays cheap even for very large XP totals, then a small bounded
// correction for floating-point rounding at the boundary. Total XP is never
// truncated/reset once the cap is reached (see getPokemonLevelProgress) —
// only the returned level itself is capped.
export function getPokemonLevelFromTotalXp(totalXp: number): number {
  const xp = safeTotalXp(totalXp);
  const estimate = Math.floor((1 + Math.sqrt(1 + (8 * xp) / XP_PER_POKEMON_LEVEL)) / 2);
  let level = Math.max(1, estimate);

  while (level < MAX_POKEMON_LEVEL && getTotalXpRequiredForPokemonLevel(level + 1) <= xp) level++;
  while (level > 1 && getTotalXpRequiredForPokemonLevel(level) > xp) level--;

  return Math.min(level, MAX_POKEMON_LEVEL);
}

// The single place a Pokémon's total XP is turned into "what the UI
// shows" — level, progress *within* the current level, and the max-level
// state. Never divides by zero: at max level, xpRequiredForNextLevel/
// remainingXp are defined as 0 and progressPercent as 100, regardless of
// how much total XP has actually accumulated past the cap.
export function getPokemonLevelProgress(totalXp: number): PokemonProgress {
  const xp = safeTotalXp(totalXp);
  const level = getPokemonLevelFromTotalXp(xp);
  const levelStartXp = getTotalXpRequiredForPokemonLevel(level);
  const isMaxLevel = level >= MAX_POKEMON_LEVEL;
  const currentLevelXp = xp - levelStartXp;
  const xpRequiredForNextLevel = isMaxLevel ? 0 : getXpRequiredForNextPokemonLevel(level);
  const remainingXp = isMaxLevel ? 0 : Math.max(0, xpRequiredForNextLevel - currentLevelXp);
  const progressPercent = isMaxLevel
    ? 100
    : xpRequiredForNextLevel > 0
      ? Math.min(100, Math.round((currentLevelXp / xpRequiredForNextLevel) * 100))
      : 0;

  return { level, totalXp: xp, currentLevelXp, xpRequiredForNextLevel, remainingXp, progressPercent, isMaxLevel };
}

// Smooth, bounded reward-scaling multiplier for defeating a wild Pokémon
// `levelDifference` levels away from `recipientLevel` — 1.0 when equal,
// increasing as the wild is higher-level (a harder fight, more reward),
// decreasing as the wild is lower-level (a trivial fight, less reward).
// Linear-then-clamped rather than any steeper curve so it stays smooth and
// gradual for realistic level gaps (see LEVEL_DIFFERENCE_MULTIPLIER_STEP's
// own doc comment) while never producing an unbounded multiplier — the
// clamp is what keeps farming far-weaker Pokémon from ever being efficient,
// and defeating far-stronger ones from ever breaking progression.
export function getLevelDifferenceXpMultiplier(recipientLevel: number, defeatedWildLevel: number): number {
  const levelDifference = safeLevel(defeatedWildLevel) - safeLevel(recipientLevel);
  const rawMultiplier = 1 + levelDifference * LEVEL_DIFFERENCE_MULTIPLIER_STEP;

  return Math.max(MIN_LEVEL_MULTIPLIER, Math.min(MAX_LEVEL_MULTIPLIER, rawMultiplier));
}

// The battle-XP reward pool for defeating a wild Pokémon of
// `defeatedWildLevel` — a flat pool, never scaled up by how many owned
// Pokémon participated (see distributeBattlePokemonXp, which splits this
// same total rather than granting it per-participant). Scaled once by
// `finisherLevel` (the Pokémon that delivered the lethal hit) via
// getLevelDifferenceXpMultiplier — the pool is computed a single time,
// before distribution, so it's evaluated against the one Pokémon whose
// fight this actually was, not recomputed per recipient; the existing
// finisher/participant split (distributeBattlePokemonXp) is entirely
// unaffected by this and still divides whatever pool comes out of here.
export function calculateBaseBattlePokemonXp(defeatedWildLevel: number, finisherLevel: number): number {
  const base = Math.max(1, Math.floor(defeatedWildLevel)) * BASE_POKEMON_XP_MULTIPLIER;
  const multiplier = getLevelDifferenceXpMultiplier(finisherLevel, defeatedWildLevel);

  return Math.max(1, Math.round(base * multiplier));
}

// Splits a fixed `baseXp` reward pool across every *eligible* (surviving,
// participating) Pokémon for one battle victory. `finisherId` must be one
// of `eligibleParticipantIds` (the currently-active Pokémon that landed the
// lethal hit is always eligible by construction — see
// battle-session.service.ts's syncWildHp). Deterministic and pure: same
// inputs always produce the same split, with the rounding remainder always
// assigned to the finisher so the total exactly equals baseXp:
//
// - 1 eligible participant: receives 100% of baseXp.
// - 2+ eligible participants: every non-finisher receives
//   floor(baseXp * POKEMON_XP_OTHER_PARTICIPANTS_SHARE / othersCount) —
//   the *whole* 35% share for exactly one other, or 35% divided evenly for
//   more than one — and the finisher receives whatever is left over
//   (baseXp minus every other's floored share), which is always >= the
//   nominal 65% because of the floor.
export function distributeBattlePokemonXp(
  baseXp: number,
  eligibleParticipantIds: string[],
  finisherId: string
): PokemonXpShare[] {
  const safeBaseXp = Math.max(0, Math.floor(baseXp) || 0);
  // Dedup defensively — callers should already pass a deduplicated list
  // (see battle-session.service.ts's participant tracking), but a pure
  // helper should never let a duplicate ID silently double-count a share.
  const uniqueIds = Array.from(new Set(eligibleParticipantIds));
  const others = uniqueIds.filter((id) => id !== finisherId);

  if (others.length === 0) {
    return [{ playerPokemonId: finisherId, role: "finisher", xpAmount: safeBaseXp, xpShare: 1 }];
  }

  const perOtherXp = Math.floor((safeBaseXp * POKEMON_XP_OTHER_PARTICIPANTS_SHARE) / others.length);
  const othersTotal = perOtherXp * others.length;
  const finisherXp = safeBaseXp - othersTotal;

  return [
    { playerPokemonId: finisherId, role: "finisher", xpAmount: finisherXp, xpShare: safeBaseXp > 0 ? finisherXp / safeBaseXp : 0 },
    ...others.map((playerPokemonId) => ({
      playerPokemonId,
      role: "participant" as const,
      xpAmount: perOtherXp,
      xpShare: safeBaseXp > 0 ? perOtherXp / safeBaseXp : 0,
    })),
  ];
}

// Pure participant-list transforms — used by battle-session.service.ts to
// read-transform-write FieldBattleSession.participants, kept here (rather
// than inline in that service) so the "how participation is tracked" rules
// are unit-testable without a database. All three are idempotent/safe to
// call redundantly, which matters because the battle UI's switch/faint
// events are fire-and-forget Server Action calls that could in principle
// race or repeat.

// Adds `playerPokemonId` as a new participant, at the end of the existing
// order, unless it's already present — a Pokémon switching in and out
// several times must still only ever appear once (see BattleParticipantRecord's
// own doc comment), so this is a no-op (returns the same array reference)
// when the ID is already tracked.
export function withParticipant(participants: BattleParticipantRecord[], playerPokemonId: string): BattleParticipantRecord[] {
  if (participants.some((participant) => participant.playerPokemonId === playerPokemonId)) {
    return participants;
  }

  return [...participants, { playerPokemonId, fainted: false, order: participants.length }];
}

// Marks an existing participant as fainted — once true, it stays true
// (calling this again, or on an ID that was never a participant, changes
// nothing) so a fainted Pokémon can never be "un-fainted" back into
// eligibility later in the same encounter.
export function withParticipantFainted(
  participants: BattleParticipantRecord[],
  playerPokemonId: string
): BattleParticipantRecord[] {
  return participants.map((participant) =>
    participant.playerPokemonId === playerPokemonId ? { ...participant, fainted: true } : participant
  );
}

// The reward-eligible subset of a participant list — every participant
// that entered the battle and never fainted. Non-participants are already
// absent from `participants` entirely (see withParticipant), so they're
// excluded "for free" by construction, never by an extra check here.
export function getEligibleParticipantIds(participants: BattleParticipantRecord[]): string[] {
  return participants.filter((participant) => !participant.fainted).map((participant) => participant.playerPokemonId);
}
