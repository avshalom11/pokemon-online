import { getAvailableLevelUpMovesAtLevel } from "../../learnsets/index.ts";
import type { LearnsetEntry, PokemonLearnset, PokemonLearnsetId } from "../../learnsets/index.ts";
import { MAX_KNOWN_MOVES } from "../constants.ts";
import type { KnownMoveId } from "../types/known-move.types.ts";

// Collapses same-moveId occurrences down to one, keeping the highest
// eligible level each survives to (the "most recent" learning of that
// move) — e.g. a move recorded once unscoped at level 9 and once under a
// versionGroup at level 7 keeps the level-9 record. `entries` must already
// be sorted ascending by level (getAvailableLevelUpMovesAtLevel's
// contract), so a later occurrence in the array is always the
// higher-or-equal-level one; the final result is re-sorted by each kept
// entry's own position so the output stays in that same chronological
// order.
function dedupeKeepingMostRecentLevel(entries: readonly LearnsetEntry[]): LearnsetEntry[] {
  const mostRecentByMoveId = new Map<KnownMoveId, { entry: LearnsetEntry; sourceIndex: number }>();

  entries.forEach((entry, sourceIndex) => {
    mostRecentByMoveId.set(entry.moveId, { entry, sourceIndex });
  });

  return [...mostRecentByMoveId.values()]
    .sort((a, b) => a.sourceIndex - b.sourceIndex)
    .map((kept) => kept.entry);
}

// The moves an owned Pokémon of `pokemonId` should start knowing at
// `level` — pure, deterministic, and independent of any owned-Pokémon
// instance (it never touches Prisma or a specific PlayerPokemon row; the
// persistence layer in features/known-moves is what turns this into
// actual KnownMove rows for a newly created Pokémon).
//
// Rule: take every level-up move eligible at or below `level` (in
// chronological — level ascending, then canonical learnset order —
// order), collapse duplicate move ids to their most recently learned
// occurrence, and keep at most MAX_KNOWN_MOVES. When there are more than
// MAX_KNOWN_MOVES eligible moves, keep the *last* MAX_KNOWN_MOVES of them
// (the most recently learned ones) but return them in normal chronological
// order, not reversed — e.g. eligible A,B,C,D,E,F -> starting C,D,E,F.
//
// Only level-up moves are ever considered — TM/HM/egg/tutor/special moves
// are out of scope for this calculation (and, as of Phase 4B, aren't part
// of any Generation 1 learnset in this project yet regardless). An
// unknown pokemonId, or a species with no eligible level-up moves yet,
// both simply produce an empty list — never a fabricated move.
export function getStartingKnownMoves(
  pokemonId: PokemonLearnsetId,
  level: number,
  learnset?: PokemonLearnset
): KnownMoveId[] {
  const eligible = getAvailableLevelUpMovesAtLevel(pokemonId, level, learnset);
  const deduped = dedupeKeepingMostRecentLevel(eligible);
  const mostRecent = deduped.slice(-MAX_KNOWN_MOVES);

  return mostRecent.map((entry) => entry.moveId);
}
