// Public entry point for the level-up move-learning engine (Phase 4D;
// pending-resolution result types added in Phase 4E — see
// features/move-learning/move-learning-service.ts's resolvePendingMoveLearn
// and declinePendingMove for the operations themselves, which stay in the
// Prisma-backed feature layer since they act on a persisted pendingId).
//
// Learnset vs. Known Moves vs. Pending Move Learning — three distinct
// concepts this whole module exists to keep separate:
//   - Learnset (engine/learnsets): static species data — which moves a
//     species can learn and at which level.
//   - Known Moves (engine/known-moves): persistent instance data — which
//     (at most four) moves one specific owned Pokémon currently knows.
//   - Pending Move Learning (this module + features/move-learning): a
//     persistent, *unresolved* opportunity for one specific owned Pokémon
//     to learn a move once its four Known Move slots are already full.
//     A pending record is not a Known Move — Phase 4E is what lets a
//     player turn one into either a Known Move (learn) or a permanently
//     skipped opportunity (decline). This phase only creates and reads
//     pending records; it never resolves them, and pending records never
//     block XP or level progression while they wait.
//
// This module is pure domain logic only — no Prisma, no React, no browser
// APIs. planLevelUpMoveLearning never writes anything; it just decides
// what *should* happen. features/move-learning is what turns a plan into
// actual PlayerKnownMove/PlayerPendingMoveLearning writes inside the same
// transaction that persists a Pokémon's XP and level (see that module's
// own docs for the transaction boundary and idempotency strategy).
//
// Current ruleset: Learnsets here are modern (current-generation)
// level-up data filtered to this project's supported move database — see
// engine/learnsets/data/generation-1/index.ts's own note — never the
// original 1996 Red/Blue/Yellow ruleset. Only level-up moves are
// considered; TM/HM/egg/tutor/special learning stay out of scope.

export type {
  PendingMoveLearningStatus,
  LevelUpMoveLearningInput,
  LevelLearnedMove,
  PendingMoveLearning,
  PendingMoveLearningRecord,
  LevelUpMoveLearningPlan,
  LevelUpMoveLearningPlanResult,
  MoveLearningApplyResult,
  ResolvePendingMoveLearnResult,
  DeclinePendingMoveResult,
} from "./types/move-learning.types.ts";

export { pendingMoveLearningStatusSchema, levelUpMoveLearningInputSchema } from "./schemas/move-learning-schema.ts";

export {
  validateLevelUpMoveLearningInput,
  isValidLevelRange,
  MoveLearningValidationError,
} from "./validation/move-learning-validation.ts";

export { planLevelUpMoveLearning } from "./planning/plan-level-up-move-learning.ts";
