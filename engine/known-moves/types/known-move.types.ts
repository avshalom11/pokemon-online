// Public type surface for the known-moves engine. The zod schemas in
// ../schemas are the source of truth (types inferred via z.infer) so the
// runtime validator and the compile-time type can never drift apart — the
// same pattern engine/moves and engine/learnsets use.
import type { KnownMoveSet } from "../schemas/known-move-schema.ts";

export type { KnownMoveSlot, KnownMove, KnownMoveSet } from "../schemas/known-move-schema.ts";

// A move id, as used throughout this module. Not re-exported from
// engine/moves to avoid a second name for the same concept — import
// `MoveId` from "@/engine/moves" directly if a consumer needs the type
// name; this module only ever passes plain strings shaped like MoveId.
export type KnownMoveId = string;

// The uniform outcome shape for every domain operation in
// ../operations/known-move-operations.ts, and reused as-is by the
// Prisma-backed persistence layer in features/known-moves. A flat
// discriminated union on `status` — the same shape this project's other
// domain results already use (see e.g. ReleasePokemonResult in
// features/pokemon/services/release-pokemon.service.ts) — rather than an
// { ok, data, error } envelope, so calling code exhaustively switches on
// `result.status` exactly like every other feature result in this
// codebase, instead of learning a second pattern just for known moves.
// "ownedPokemonNotFound" is the one status only the persistence layer can
// ever produce (the pure engine layer has no concept of an owned Pokémon
// id) — included here so both layers share one result type instead of
// each inventing their own.
export type KnownMoveOperationResult =
  | { status: "success"; knownMoves: KnownMoveSet }
  | { status: "moveNotFound"; moveId: KnownMoveId }
  | { status: "moveAlreadyKnown"; moveId: KnownMoveId }
  | { status: "moveSetFull" }
  | { status: "invalidSlot"; slot: number }
  | { status: "moveNotKnown"; slot: number }
  | { status: "invalidReorder"; reason: string }
  | { status: "validationFailed"; message: string }
  | { status: "ownedPokemonNotFound"; ownedPokemonId: string };

// The subset of KnownMoveOperationResult that isn't "success" — useful for
// typing a caught/returned failure without repeating the whole union.
export type KnownMoveOperationFailure = Exclude<KnownMoveOperationResult, { status: "success" }>;
