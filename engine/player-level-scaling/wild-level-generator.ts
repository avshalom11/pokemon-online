import { getWildLevelRangeForPlayerLevel, type WildLevelRange } from "./wild-level-bracket-lookup";

// The one inclusive-range random pick every wild-encounter level roll goes
// through — Phase 1's generateWildLevelForPlayer below (the player's own
// bracket) and Phase 2's pokemon-encounter-engine.ts (a specific species'
// narrower eligible overlap — see engine/evolution-stage-scaling) both call
// this instead of rolling their own, so "how a level is randomized within a
// range" is never duplicated.
export function rollLevelInRange(range: WildLevelRange): number {
  return Math.floor(Math.random() * (range.maximumLevel - range.minimumLevel + 1)) + range.minimumLevel;
}

// Deliberately takes only the player's level, never a ZoneEncounter's own
// minimumLevel/maximumLevel — see this feature's own Phase 1 scope: those
// fields are kept on ZoneEncounter for future systems, but are no longer
// read for level generation anywhere. Still used as-is by
// engine/encounter/legendary-test-boost.ts's dev-only boosted path; the
// real production path (pokemon-encounter-engine.ts) moved to rolling
// within a specific species' eligible range directly (Phase 2) instead of
// the player's raw bracket, via rollLevelInRange above.
export function generateWildLevelForPlayer(playerLevel: number): number {
  return rollLevelInRange(getWildLevelRangeForPlayerLevel(playerLevel));
}
