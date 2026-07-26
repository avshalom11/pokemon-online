// Public entry point for the known-moves engine (Phase 4C).
//
// Learnset vs. Known Moves — the distinction this whole module exists to
// enforce: a species' Learnset (engine/learnsets) is static data describing
// every move that species is *capable* of learning and how. Known Moves
// are per-owned-Pokémon instance state describing which (at most four)
// moves *this specific* Pokémon currently knows. A Bulbasaur's Learnset
// may list a dozen level-up moves; one owned Bulbasaur's Known Moves are
// whichever four (or fewer) of those it actually has right now.
//
// This module is pure domain logic only — no Prisma, no React, no browser
// APIs. The Prisma-backed persistence layer (features/known-moves) reads
// a PlayerPokemon's known-move rows, calls the operations here, and
// writes the result back inside a transaction; it never re-implements
// slot/duplicate/full rules itself. Everything here is safe to reuse from
// starter creation, capture, level-up processing, move-learning UI,
// battle prep, or tests.
//
// Current ruleset: at most four known moves per owned Pokémon (see
// constants.ts's MAX_KNOWN_MOVES), no PP tracking of any kind (a Move's
// maxPp is static metadata on the move itself — see engine/moves — and
// stays completely unused here, exactly as in the move/learnset engines).
// Starting moves are computed from level-up Learnset entries only — never
// TM/HM/egg/tutor/special — because those methods aren't part of any
// Generation 1 Learnset yet (Phase 4B) and aren't in scope for this phase
// regardless. When there are more than four eligible level-up moves, the
// four *most recently learned* ones are kept (see starting-moves for why:
// it mirrors how a leveling Pokémon in the actual games "forgets" its
// earliest moves in favor of newer ones once a moveset fills up).
// Level-up-triggered learning (deciding when a Pokémon *gains* a new
// eligible move as it levels up, and prompting to replace an existing
// move) is not implemented here — this phase only covers the moves an
// owned Pokémon starts with and the raw add/replace/remove/reorder
// primitives; wiring those into the level-up flow is a future phase.

export { MAX_KNOWN_MOVES, MIN_KNOWN_MOVE_SLOT, MAX_KNOWN_MOVE_SLOT } from "./constants.ts";

export type {
  KnownMoveSlot,
  KnownMove,
  KnownMoveSet,
  KnownMoveId,
  KnownMoveOperationResult,
  KnownMoveOperationFailure,
} from "./types/known-move.types.ts";

export { knownMoveSlotSchema, knownMoveSchema, knownMoveSetSchema } from "./schemas/known-move-schema.ts";

export { validateKnownMoveSet, isValidKnownMoveSet, KnownMoveValidationError } from "./validation/known-move-validation.ts";

export { getStartingKnownMoves } from "./starting-moves/starting-known-moves.ts";

export {
  getKnownMoveIds,
  getResolvedKnownMoves,
  isMoveKnown,
  getKnownMoveCount,
  isKnownMoveSetFull,
  hasAvailableKnownMoveSlot,
} from "./queries/known-move-queries.ts";

export {
  buildKnownMoveSet,
  addKnownMove,
  replaceKnownMove,
  removeKnownMove,
  reorderKnownMoves,
} from "./operations/known-move-operations.ts";
