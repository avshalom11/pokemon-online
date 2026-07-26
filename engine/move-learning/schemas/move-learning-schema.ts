import { z } from "zod";

import { moveIdSchema } from "../../moves/index.ts";
import { pokemonIdSchema } from "../../learnsets/index.ts";
import { MAX_KNOWN_MOVES } from "../../known-moves/index.ts";

// The three states a pending move-learning decision can be in. Phase 4D
// only ever creates "pending" rows — "learned"/"declined" exist so
// Phase 4E's resolution flow has somewhere to transition a row to without
// a schema change.
export const pendingMoveLearningStatusSchema = z.enum(["pending", "learned", "declined"]);

// Input to the pure planner (planLevelUpMoveLearning). Validated as a
// shape check only — referential integrity (do these move/species ids
// actually exist) is guaranteed upstream by the move/learnset registries'
// own eager validation, not re-checked here.
export const levelUpMoveLearningInputSchema = z.object({
  pokemonId: pokemonIdSchema,
  oldLevel: z.int().positive(),
  newLevel: z.int().positive(),
  currentKnownMoveIds: z.array(moveIdSchema).max(MAX_KNOWN_MOVES),
  existingPendingMoveIds: z.array(moveIdSchema),
});

export type PendingMoveLearningStatus = z.infer<typeof pendingMoveLearningStatusSchema>;
export type LevelUpMoveLearningInput = z.infer<typeof levelUpMoveLearningInputSchema>;
