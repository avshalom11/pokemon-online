import {
  getAllBranchEvolutionEntries,
  getAllEvolutionItemEvolutionEntries,
  getAllLevelEvolutionEntries,
  getAllLevelStatEvolutionEntries,
  getEvolutionOptions,
  getLevelEvolution,
} from "@/data/pokemon/pokemon-evolutions";

// EGGS PHASE 4 — the one reusable hatch-level calculator, shared by any
// future egg/incubator system (never re-derived per call site). Pure and
// synchronous: no DB, no randomness of its own (the caller supplies the
// [0,1) roll, same injection convention every other production random roll
// in this project already uses — see engine/damage/random.ts).
//
// Stage classification and every level threshold below are read entirely
// from the existing evolution tables (data/pokemon/pokemon-evolutions.ts) —
// never a new evolution mechanic, never a guessed level. Only plain,
// unconditional LEVEL_EVOLUTIONS entries ever produce a "clean" level
// number; branch/item/stat-branch evolutions only ever prove a species HAS
// a predecessor/successor (for stage classification), never a specific
// clean level — exactly the "item evolution with no level threshold" /
// "ambiguous branch" cases this phase's own fallback rules name explicitly.
export type EvolutionStage = "first" | "middle" | "final" | "standalone";

export interface HatchLevelRange {
  minimumLevel: number;
  maximumLevel: number;
}

const FALLBACK_RANGES: Record<EvolutionStage, HatchLevelRange> = {
  first: { minimumLevel: 10, maximumLevel: 25 },
  middle: { minimumLevel: 25, maximumLevel: 35 },
  final: { minimumLevel: 35, maximumLevel: 45 },
  standalone: { minimumLevel: 15, maximumLevel: 45 },
};

// Built once at module load — every species reachable via a PLAIN level
// evolution, mapped to the (possibly more-than-one, if a data change ever
// introduced two independent predecessors) set of levels it was reached
// at. `hasIncoming` is broader: true if ANY method (level, item, branch,
// stat-branch) reaches this species — used for stage classification only,
// never for a clean level number.
interface ReverseLevelInfo {
  levels: number[];
  hasIncoming: boolean;
}

function buildReverseIndex(): Map<string, ReverseLevelInfo> {
  const index = new Map<string, ReverseLevelInfo>();

  function ensure(speciesId: string): ReverseLevelInfo {
    let entry = index.get(speciesId);
    if (!entry) {
      entry = { levels: [], hasIncoming: false };
      index.set(speciesId, entry);
    }
    return entry;
  }

  for (const { evolution } of getAllLevelEvolutionEntries()) {
    const entry = ensure(evolution.evolvesToSpeciesId);
    entry.hasIncoming = true;
    entry.levels.push(evolution.requiredLevel);
  }
  for (const { evolution } of getAllEvolutionItemEvolutionEntries()) {
    ensure(evolution.evolvesToSpeciesId).hasIncoming = true;
  }
  for (const { evolution } of getAllBranchEvolutionEntries()) {
    for (const target of evolution.targets) ensure(target).hasIncoming = true;
  }
  for (const { evolution } of getAllLevelStatEvolutionEntries()) {
    ensure(evolution.attackGreaterTarget).hasIncoming = true;
    ensure(evolution.attackLessTarget).hasIncoming = true;
    ensure(evolution.equalTarget).hasIncoming = true;
  }

  return index;
}

let reverseIndex: Map<string, ReverseLevelInfo> | null = null;

function getReverseIndex(): Map<string, ReverseLevelInfo> {
  if (!reverseIndex) reverseIndex = buildReverseIndex();
  return reverseIndex;
}

// The single clean level this species was reached at, only if it has
// exactly one plain-level-evolution predecessor. undefined for a base
// species, a species reached only via branch/item/stat, or the
// (data-inconsistency-only) case of more than one conflicting level —
// never guessed.
function getCleanReachedAtLevel(speciesId: string): number | undefined {
  const levels = getReverseIndex().get(speciesId)?.levels ?? [];
  return levels.length === 1 ? levels[0] : undefined;
}

// The single clean level THIS species evolves at, only if via a plain
// LEVEL_EVOLUTIONS entry — undefined for branch/item/stat/no evolution.
function getCleanNextLevel(speciesId: string): number | undefined {
  return getLevelEvolution(speciesId)?.requiredLevel;
}

export function determineEvolutionStage(speciesId: string): EvolutionStage {
  const hasOutgoing = getEvolutionOptions(speciesId).length > 0;
  const hasIncoming = getReverseIndex().get(speciesId)?.hasIncoming ?? false;

  if (!hasOutgoing && !hasIncoming) return "standalone";
  if (!hasIncoming) return "first";
  if (hasOutgoing) return "middle";
  return "final";
}

// The one reusable hatch-level-range calculator (EGGS PHASE 4's own spec):
//   - first stage:  [10, nextLevel - 1]
//   - middle stage: [reachedAtLevel + 1, nextLevel - 1]
//   - final stage:  [reachedAtLevel + 1, 45]
//   - standalone:   [15, 45] always (no fallback distinction — this IS the
//                    only rule for a species with no evolution family)
// Falls back to the approved fallback range for that same stage whenever
// the normal rule can't produce a valid (min <= max) range from a clean
// level number — an item/branch/stat-branch predecessor or successor, a
// final-stage threshold above 45, or any other case with no single clean
// level to anchor on.
export function getHatchLevelRange(speciesId: string): HatchLevelRange {
  const stage = determineEvolutionStage(speciesId);

  if (stage === "standalone") return FALLBACK_RANGES.standalone;

  if (stage === "first") {
    const nextLevel = getCleanNextLevel(speciesId);
    if (nextLevel !== undefined) {
      const maximumLevel = nextLevel - 1;
      if (maximumLevel >= 10) return { minimumLevel: 10, maximumLevel };
    }
    return FALLBACK_RANGES.first;
  }

  if (stage === "final") {
    const reachedAtLevel = getCleanReachedAtLevel(speciesId);
    if (reachedAtLevel !== undefined) {
      const minimumLevel = reachedAtLevel + 1;
      if (minimumLevel <= 45) return { minimumLevel, maximumLevel: 45 };
    }
    return FALLBACK_RANGES.final;
  }

  // middle
  const reachedAtLevel = getCleanReachedAtLevel(speciesId);
  const nextLevel = getCleanNextLevel(speciesId);
  if (reachedAtLevel !== undefined && nextLevel !== undefined) {
    const minimumLevel = reachedAtLevel + 1;
    const maximumLevel = nextLevel - 1;
    if (minimumLevel <= maximumLevel) return { minimumLevel, maximumLevel };
  }
  return FALLBACK_RANGES.middle;
}

// Rolls one concrete hatch level from the species' own range — a uniform
// integer roll over [minimumLevel, maximumLevel] (inclusive both ends),
// the same [0,1)-roll-times-width-floor shape rollDamageRandomFactor
// (engine/damage/random.ts) already establishes for its own integer range.
export function rollHatchLevel(speciesId: string, random: () => number = Math.random): number {
  const { minimumLevel, maximumLevel } = getHatchLevelRange(speciesId);
  const width = maximumLevel - minimumLevel + 1;
  return minimumLevel + Math.floor(random() * width);
}
