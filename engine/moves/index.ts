// Public entry point for the move engine. Phase 3A built the architecture;
// Phase 3B populated the complete Generation 1 move database on top of it
// (every move still has implementationStatus: "data-only" — no learnsets,
// move selection, or damage calculation yet).
//
// This is a separate system from the legacy shared/types/move.ts +
// data/moves/move-data.ts pair that engine/battle/battle-engine.ts and
// friends currently import. That pair predates this engine, is not
// currently wired into live gameplay (see the TEMPORARY note atop
// engine/battle/battle-config.ts), and is left untouched here. Future work
// migrating the battle engine onto this system is a separate, deliberate
// change, not a side effect of adding this file.

export type {
  Move,
  MoveId,
  MoveCategory,
  MoveTarget,
  MoveType,
  ImplementationStatus,
  MoveEffect,
  MoveEffectKind,
  StatusCondition,
  StatName,
  StatStageChange,
  FixedDamageBasis,
  ScreenType,
  MoveFlag,
} from "./types/move.types.ts";

export { ALL_MOVE_FLAGS } from "./flags/move-flags.ts";
export { ALL_STATUS_CONDITIONS, ALL_STAT_NAMES, ALL_SCREEN_TYPES } from "./effects/effect-types.ts";

export { moveSchema, moveCategorySchema, moveTargetSchema, moveTypeSchema, implementationStatusSchema, moveIdSchema } from "./schemas/move-schema.ts";
export { moveEffectSchema, screenTypeSchema } from "./effects/effect-schema.ts";
export { moveFlagSchema } from "./flags/move-flags.ts";

export { validateMove, validateMoveList, MoveValidationError } from "./validation/move-validation.ts";

export { buildMoveRegistry, getAllMoves, getMoveById } from "./registry/move-registry.ts";

export {
  getMovesByGeneration,
  getMovesByType,
  getMovesByCategory,
  getMovesByFlag,
  getMovesByImplementationStatus,
} from "./queries/move-queries.ts";
