import { z } from "zod";

import { getMoveById } from "../../moves/index.ts";
import { knownMoveSetSchema } from "../schemas/known-move-schema.ts";
import type { KnownMoveSet } from "../types/known-move.types.ts";

export class KnownMoveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnownMoveValidationError";
  }
}

function formatZodError(context: string, error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `  - ${path}: ${issue.message}`;
  });

  return [`${context}:`, ...lines].join("\n");
}

// Validates a known-move set's shape (max four, unique moveIds, unique
// slots, contiguous 1..N) and then its referential integrity: every
// moveId must resolve in the move registry. Throws
// KnownMoveValidationError on any failure — never silently accepts an
// unknown move.
export function validateKnownMoveSet(candidate: unknown): KnownMoveSet {
  const result = knownMoveSetSchema.safeParse(candidate);

  if (!result.success) {
    throw new KnownMoveValidationError(formatZodError("Invalid known-move set", result.error));
  }

  const knownMoves = result.data;

  const unknownMoveIds = [...new Set(knownMoves.map((move) => move.moveId))].filter(
    (moveId) => getMoveById(moveId) === undefined
  );

  if (unknownMoveIds.length > 0) {
    throw new KnownMoveValidationError(
      `Known-move set references unknown moveId(s): ${unknownMoveIds.join(", ")} (no matching move in the move registry)`
    );
  }

  return knownMoves;
}

// Non-throwing counterpart, for call sites that want a boolean/message
// instead of a try/catch — e.g. an operation that wants to fold validation
// failure into its own KnownMoveOperationResult "validationFailed" status.
export function isValidKnownMoveSet(candidate: unknown): boolean {
  try {
    validateKnownMoveSet(candidate);
    return true;
  } catch (error) {
    if (error instanceof KnownMoveValidationError) return false;
    throw error;
  }
}
