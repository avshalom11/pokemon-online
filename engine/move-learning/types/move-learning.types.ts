import type { KnownMoveId, KnownMoveSet, KnownMoveOperationFailure } from "../../known-moves/index.ts";
import type { PendingMoveLearningStatus } from "../schemas/move-learning-schema.ts";

export type { PendingMoveLearningStatus, LevelUpMoveLearningInput } from "../schemas/move-learning-schema.ts";

// One move detected in a level interval, and the level at which it was
// first encountered during processing — used both for "moves detected in
// this interval" and for pending decisions (where the level must be
// remembered for display and for deterministic ordering).
export interface LevelLearnedMove {
  moveId: KnownMoveId;
  learnedAtLevel: number;
}

// A persisted Pending Move Learning decision, in domain form — the
// Prisma-backed persistence layer (features/move-learning) maps
// PlayerPendingMoveLearning rows to this shape; nothing outside that
// mapping layer ever sees the raw row (id, sequence, timestamps, the
// owning playerPokemonId are persistence details, not domain concepts).
export interface PendingMoveLearning {
  moveId: KnownMoveId;
  learnedAtLevel: number;
  status: PendingMoveLearningStatus;
}

// PendingMoveLearning plus the persistence identifiers Phase 4E's
// resolution flow needs (the row id to resolve/decline by, and which
// Pokémon it belongs to) — everything read/query helpers that hand a
// pending record to a caller expecting to act on it (not just display it)
// return this instead of the bare PendingMoveLearning above.
export interface PendingMoveLearningRecord extends PendingMoveLearning {
  id: string;
  playerPokemonId: string;
}

// resolvePendingMoveLearn's result — "learn" is always a *replacement*
// (see RULES: "Learning a pending move never creates a fifth Known
// Move" — there is no separate "append" path even when a slot happens to
// be open), so its failure shapes reuse engine/known-moves'
// KnownMoveOperationFailure wholesale (moveNotFound/moveAlreadyKnown/
// moveSetFull/invalidSlot/moveNotKnown/invalidReorder/validationFailed/
// ownedPokemonNotFound) rather than hand-picking just the ones
// replaceKnownMove happens to produce today — safer against that
// function's own failure set changing later — plus the two outcomes only
// pending resolution itself can produce.
export type ResolvePendingMoveLearnResult =
  | { status: "success"; knownMoves: KnownMoveSet; pendingId: string; playerPokemonId: string }
  | { status: "pendingNotFound"; pendingId: string }
  | { status: "pendingAlreadyResolved"; pendingId: string; currentStatus: PendingMoveLearningStatus }
  | KnownMoveOperationFailure;

// declinePendingMove's result — no Known Move state is ever touched, so
// only the pending-record-specific outcomes apply.
export type DeclinePendingMoveResult =
  | { status: "success"; pendingId: string; playerPokemonId: string }
  | { status: "pendingNotFound"; pendingId: string }
  | { status: "pendingAlreadyResolved"; pendingId: string; currentStatus: PendingMoveLearningStatus };

// The deterministic outcome of planning a level-up move-learning pass —
// see planning/plan-level-up-move-learning.ts for the full algorithm.
// Every array here is already in canonical (level ascending, then
// Learnset declaration order) processing order.
export interface LevelUpMoveLearningPlan {
  oldLevel: number;
  newLevel: number;

  // Every distinct move-learning opportunity found in (oldLevel, newLevel]
  // — one entry per move, even if the Learnset happened to list it more
  // than once in this interval (only the first eligible occurrence is
  // recorded here). This is the superset that automaticallyLearnedMoveIds
  // + pendingMoves + alreadyKnownMoveIds + alreadyPendingMoveIds exactly
  // partition.
  detectedMoves: LevelLearnedMove[];

  // Moves appended directly to Known Moves this plan, in the order they
  // were learned.
  automaticallyLearnedMoveIds: KnownMoveId[];

  // Moves that could not be auto-learned because Known Moves were already
  // full by the time processing reached them — new Pending Move Learning
  // decisions this plan creates, in canonical order.
  pendingMoves: LevelLearnedMove[];

  // Detected moves skipped because they were already a Known Move —
  // either before this plan started, or because an earlier move in this
  // very interval was already the same move (a duplicate Learnset
  // occurrence).
  alreadyKnownMoveIds: KnownMoveId[];

  // Detected moves skipped because they already had an unresolved Pending
  // Move Learning decision — either pre-existing, or queued earlier in
  // this very plan (a duplicate Learnset occurrence).
  alreadyPendingMoveIds: KnownMoveId[];

  // The projected Known Move ids after applying every automatic learn in
  // this plan, in slot order (original known moves first, unchanged,
  // followed by newly learned ones in the order they were learned).
  finalKnownMoveIds: KnownMoveId[];
}

// planLevelUpMoveLearning's return shape — the same flat
// discriminated-on-`status` convention as engine/known-moves'
// KnownMoveOperationResult, rather than a thrown exception or an
// { ok, data, error } envelope.
export type LevelUpMoveLearningPlanResult =
  | { status: "success"; plan: LevelUpMoveLearningPlan }
  | { status: "invalidLevelRange"; oldLevel: number; newLevel: number }
  | { status: "validationFailed"; message: string };

// features/move-learning's applyLevelUpMoveLearning result — the
// persistence-layer counterpart to LevelUpMoveLearningPlanResult, sharing
// its "success"/"invalidLevelRange"/"validationFailed" statuses and
// adding the ones only a Prisma-backed operation can produce
// ("ownedPokemonNotFound", "persistenceConflict"). Defined here (not in
// features/) so both layers share one result type instead of each
// inventing their own — same precedent as KnownMoveOperationResult
// including "ownedPokemonNotFound" despite the pure engine/known-moves
// layer never producing it itself.
export type MoveLearningApplyResult =
  | { status: "success"; plan: LevelUpMoveLearningPlan }
  | { status: "invalidLevelRange"; oldLevel: number; newLevel: number }
  | { status: "validationFailed"; message: string }
  | { status: "ownedPokemonNotFound"; ownedPokemonId: string }
  | { status: "persistenceConflict"; message: string };
