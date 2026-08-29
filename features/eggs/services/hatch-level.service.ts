import { getHatchLevelRangeForPlayerLevel } from "@/features/eggs/config/egg-hatch-level-brackets.config";

// EGG HATCH REBALANCE — the hatch level is now rolled from the PLAYER's own
// level bracket (features/eggs/config/egg-hatch-level-brackets.config.ts),
// never from the hatched species' own evolution stage — that relationship
// is reversed: the rolled level here goes on to pick the correct evolution
// stage instead (see engine/evolution-stage-scaling/family-level-resolution.ts,
// called from hatch.service.ts's own hatchIncubation). Pure and synchronous:
// no DB, no randomness of its own (the caller supplies the [0,1) roll, same
// injection convention every other production random roll in this project
// already uses — see engine/damage/random.ts).
export function rollHatchLevel(playerLevel: number, random: () => number = Math.random): number {
  const { minimumLevel, maximumLevel } = getHatchLevelRangeForPlayerLevel(playerLevel);
  const width = maximumLevel - minimumLevel + 1;
  return minimumLevel + Math.floor(random() * width);
}
