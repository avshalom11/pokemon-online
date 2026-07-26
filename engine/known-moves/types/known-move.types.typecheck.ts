// Compile-time-only checks for the known-moves engine's public types. This
// file is never imported or executed — `npx tsc --noEmit` is what
// exercises it, the same pattern used by engine/moves and
// engine/learnsets' own *.typecheck.ts files.
import type { KnownMove, KnownMoveSet, KnownMoveOperationResult } from "./known-move.types.ts";

// A fully valid KnownMoveSet literal must type-check with no errors.
const validSet: KnownMoveSet = [
  { moveId: "tackle", slot: 1 },
  { moveId: "growl", slot: 2 },
];
void validSet;

// @ts-expect-error — slot must be a number, not a string.
const invalidSlot: KnownMove = { moveId: "tackle", slot: "1" };
void invalidSlot;

// @ts-expect-error — moveId is required.
const missingMoveId: KnownMove = { slot: 1 };
void missingMoveId;

// Narrowing on `status` must give each result variant its own fields.
function describeResult(result: KnownMoveOperationResult): string {
  switch (result.status) {
    case "success":
      // Only reachable here because the discriminant narrowed the union.
      return `${result.knownMoves.length} known move(s)`;
    case "moveNotFound":
    case "moveAlreadyKnown":
      return result.moveId;
    case "invalidSlot":
    case "moveNotKnown":
      return String(result.slot);
    case "invalidReorder":
      return result.reason;
    case "validationFailed":
      return result.message;
    case "ownedPokemonNotFound":
      return result.ownedPokemonId;
    case "moveSetFull":
      return "full";
  }
}
void describeResult;

// @ts-expect-error — "success" results carry `knownMoves`, not `moveId`.
const invalidResult: KnownMoveOperationResult = { status: "success", moveId: "tackle" };
void invalidResult;
