import { z } from "zod";

import { moveSchema } from "../schemas/move-schema.ts";
import type { Move } from "../types/move.types.ts";

export class MoveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoveValidationError";
  }
}

function formatZodError(context: string, error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `  - ${path}: ${issue.message}`;
  });

  return [`${context}:`, ...lines].join("\n");
}

// Validates a single move against the schema. Throws MoveValidationError
// with every failing field listed, rather than stopping at the first one.
export function validateMove(candidate: unknown): Move {
  const result = moveSchema.safeParse(candidate);

  if (!result.success) {
    const id =
      typeof candidate === "object" && candidate !== null && "id" in candidate
        ? String((candidate as { id: unknown }).id)
        : "(unknown id)";

    throw new MoveValidationError(formatZodError(`Invalid move "${id}"`, result.error));
  }

  return result.data;
}

// Validates every move in a list and asserts there are no duplicate IDs
// across the whole set. Collects every problem before throwing so a bad
// data file reports everything wrong in one pass instead of one error at a
// time.
export function validateMoveList(candidates: readonly unknown[]): Move[] {
  const problems: string[] = [];
  const validated: Move[] = [];
  const seenIds = new Map<string, number>();

  candidates.forEach((candidate, index) => {
    try {
      const move = validateMove(candidate);
      validated.push(move);

      const firstSeenAt = seenIds.get(move.id);
      if (firstSeenAt !== undefined) {
        problems.push(
          `Duplicate move id "${move.id}" at index ${index} (already defined at index ${firstSeenAt})`
        );
      } else {
        seenIds.set(move.id, index);
      }
    } catch (error) {
      if (error instanceof MoveValidationError) {
        problems.push(`[index ${index}] ${error.message}`);
      } else {
        throw error;
      }
    }
  });

  if (problems.length > 0) {
    throw new MoveValidationError(
      [`Move list validation failed with ${problems.length} problem(s):`, ...problems].join("\n\n")
    );
  }

  return validated;
}
