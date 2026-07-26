import { z } from "zod";

import { levelUpMoveLearningInputSchema } from "../schemas/move-learning-schema.ts";
import type { LevelUpMoveLearningInput } from "../types/move-learning.types.ts";

export class MoveLearningValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoveLearningValidationError";
  }
}

function formatZodError(context: string, error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `  - ${path}: ${issue.message}`;
  });

  return [`${context}:`, ...lines].join("\n");
}

// Shape validation for planLevelUpMoveLearning's input (positive levels,
// well-formed move ids, at most MAX_KNOWN_MOVES current known moves).
// Throws — the planner itself calls this and converts the exception into
// its own non-throwing "validationFailed" status, so callers of the
// planner never need a try/catch.
export function validateLevelUpMoveLearningInput(candidate: unknown): LevelUpMoveLearningInput {
  const result = levelUpMoveLearningInputSchema.safeParse(candidate);

  if (!result.success) {
    throw new MoveLearningValidationError(formatZodError("Invalid level-up move-learning input", result.error));
  }

  return result.data;
}

// oldLevel is exclusive, newLevel is inclusive (see planning module for
// why) — that only makes sense when newLevel >= oldLevel. Equal levels
// are valid (an empty interval — no moves learned, not an error, since a
// no-level-up XP grant must be a normal no-op); newLevel < oldLevel is
// never valid (a Pokémon's level only ever increases).
export function isValidLevelRange(oldLevel: number, newLevel: number): boolean {
  return newLevel >= oldLevel;
}
