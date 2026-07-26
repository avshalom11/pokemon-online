import { getLearnsetByPokemonId } from "../registry/learnset-registry.ts";
import type { LearnsetEntry, PokemonLearnset, PokemonLearnsetId } from "../types/learnset.types.ts";

// Every query helper below is pure and deterministic: no React, no browser
// APIs, no Prisma, no mutation of the registry or its inputs. They read a
// PokemonLearnset and return LearnsetEntry[] — never bare move ids — so
// callers keep access to method/versionGroup metadata without a second
// lookup. Safe to call from onboarding, wild Pokémon creation, level-up
// processing, move-learning UI, battle prep, or tests alike.
//
// Each helper accepts an optional `learnset` override (defaulting to a
// registry lookup by pokemonId) so they can be exercised against fixture
// data in tests without depending on populated generation data — the same
// pattern engine/moves/queries/move-queries.ts uses for its optional
// `moves` list.

function resolveLearnset(pokemonId: PokemonLearnsetId, override?: PokemonLearnset): PokemonLearnset | undefined {
  return override ?? getLearnsetByPokemonId(pokemonId);
}

// Sorts a set of level-up entries by learning level ascending, preserving
// original entry order for ties (Array#sort is a stable sort). This is the
// "1. learning level, 2. original learnset entry order" rule the query API
// promises for every level-based helper below.
function sortByLevelThenOriginalOrder(entries: readonly LearnsetEntry[]): LearnsetEntry[] {
  return [...entries].sort((a, b) => {
    if (a.method.kind !== "level-up" || b.method.kind !== "level-up") return 0;
    return a.method.level - b.method.level;
  });
}

export function getLearnsetEntries(pokemonId: PokemonLearnsetId, learnset?: PokemonLearnset): LearnsetEntry[] {
  return resolveLearnset(pokemonId, learnset)?.entries ?? [];
}

export function getLevelUpEntries(pokemonId: PokemonLearnsetId, learnset?: PokemonLearnset): LearnsetEntry[] {
  return getLearnsetEntries(pokemonId, learnset).filter((entry) => entry.method.kind === "level-up");
}

export function getMachineEntries(pokemonId: PokemonLearnsetId, learnset?: PokemonLearnset): LearnsetEntry[] {
  return getLearnsetEntries(pokemonId, learnset).filter((entry) => entry.method.kind === "machine");
}

export function getTutorEntries(pokemonId: PokemonLearnsetId, learnset?: PokemonLearnset): LearnsetEntry[] {
  return getLearnsetEntries(pokemonId, learnset).filter((entry) => entry.method.kind === "tutor");
}

export function getEggEntries(pokemonId: PokemonLearnsetId, learnset?: PokemonLearnset): LearnsetEntry[] {
  return getLearnsetEntries(pokemonId, learnset).filter((entry) => entry.method.kind === "egg");
}

export function getSpecialEntries(pokemonId: PokemonLearnsetId, learnset?: PokemonLearnset): LearnsetEntry[] {
  return getLearnsetEntries(pokemonId, learnset).filter((entry) => entry.method.kind === "special");
}

// Moves learned at exactly `level` — no more, no less.
export function getMovesLearnedAtLevel(
  pokemonId: PokemonLearnsetId,
  level: number,
  learnset?: PokemonLearnset
): LearnsetEntry[] {
  const atLevel = getLevelUpEntries(pokemonId, learnset).filter(
    (entry) => entry.method.kind === "level-up" && entry.method.level === level
  );
  return sortByLevelThenOriginalOrder(atLevel);
}

// Moves learned after `previousLevel` and up to and including `newLevel`
// (e.g. previousLevel=4, newLevel=7 returns moves learned at levels 5, 6,
// and 7) — the set a level-up should grant when a Pokémon jumps several
// levels at once.
export function getMovesLearnedBetweenLevels(
  pokemonId: PokemonLearnsetId,
  previousLevel: number,
  newLevel: number,
  learnset?: PokemonLearnset
): LearnsetEntry[] {
  const between = getLevelUpEntries(pokemonId, learnset).filter(
    (entry) => entry.method.kind === "level-up" && entry.method.level > previousLevel && entry.method.level <= newLevel
  );
  return sortByLevelThenOriginalOrder(between);
}

// Every level-up move whose required level is <= `level` — the full
// level-up movepool a Pokémon of that level could know, before any
// four-known-move limiting (that policy is Phase 4C/4D, not this query).
export function getAvailableLevelUpMovesAtLevel(
  pokemonId: PokemonLearnsetId,
  level: number,
  learnset?: PokemonLearnset
): LearnsetEntry[] {
  const available = getLevelUpEntries(pokemonId, learnset).filter(
    (entry) => entry.method.kind === "level-up" && entry.method.level <= level
  );
  return sortByLevelThenOriginalOrder(available);
}

// The level-up moves available by `startingLevel`. Computed identically to
// getAvailableLevelUpMovesAtLevel — "starting moves" is that same
// computation applied at a Pokémon's starting level rather than its
// current battle level. Kept as its own named export because callers
// (onboarding, wild Pokémon creation) reason about it as a distinct
// concept, even though the underlying rule is the same.
export function getStartingMoves(
  pokemonId: PokemonLearnsetId,
  startingLevel: number,
  learnset?: PokemonLearnset
): LearnsetEntry[] {
  return getAvailableLevelUpMovesAtLevel(pokemonId, startingLevel, learnset);
}
