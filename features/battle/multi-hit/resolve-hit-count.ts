// Phase 6L — pure hit-count resolution for multi-hit moves (Double Slap,
// Comet Punch, Fury Attack, Fury Swipes, Pin Missile, Spike Cannon, Barrage,
// Double Kick, Twineedle). Reuses the Move Registry's own existing
// { kind: "multi-hit", minHits, maxHits } fields exactly as they already
// are — no new "distribution" field was added to that schema, since the
// only two shapes any currently-configured move actually needs are "fixed
// count" (minHits === maxHits, e.g. Double Kick/Twineedle's 2-2) and "2-5
// hits" (every other configured multi-hit move). No Prisma, no Hebrew
// strings, no move id/name — this never branches on which move it is,
// only on its minHits/maxHits shape.
//
// A fixed-count move consumes NO random roll at all (there is nothing to
// decide). A 2-5 move draws exactly one roll, using the canonical
// mainline-series distribution: 2 hits 3/8, 3 hits 3/8, 4 hits 1/8, 5 hits
// 1/8 (37.5% / 37.5% / 12.5% / 12.5%). Any other configured range (should
// one ever be added) falls back to a uniform distribution across
// [minHits, maxHits] rather than guessing at a different canonical table.

export interface MultiHitEffect {
  minHits: number;
  maxHits: number;
}

const TWO_TO_FIVE_THRESHOLDS: ReadonlyArray<{ upTo: number; hits: number }> = [
  { upTo: 0.375, hits: 2 },
  { upTo: 0.75, hits: 3 },
  { upTo: 0.875, hits: 4 },
  { upTo: 1, hits: 5 },
];

export function resolveHitCount(effect: MultiHitEffect, random: () => number = Math.random): number {
  if (effect.minHits === effect.maxHits) {
    return effect.minHits;
  }

  const roll = random();

  if (effect.minHits === 2 && effect.maxHits === 5) {
    const match = TWO_TO_FIVE_THRESHOLDS.find((threshold) => roll < threshold.upTo);
    return match ? match.hits : 5;
  }

  const span = effect.maxHits - effect.minHits + 1;
  return effect.minHits + Math.floor(roll * span);
}
