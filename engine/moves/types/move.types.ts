// Public type surface for the move engine. Zod schemas in ../schemas and
// ../effects are the source of truth (types are inferred from them via
// z.infer) so the runtime validator and the compile-time type can never
// drift apart — this file just re-exports the plain TypeScript names so
// consumers don't need to know the types are schema-derived.
export type {
  Move,
  MoveId,
  MoveCategory,
  MoveTarget,
  MoveType,
  ImplementationStatus,
} from "../schemas/move-schema.ts";

export type {
  MoveEffect,
  MoveEffectKind,
  StatusCondition,
  StatName,
  StatStageChange,
  FixedDamageBasis,
  ScreenType,
} from "../effects/effect-types.ts";

export type { MoveFlag } from "../flags/move-flags.ts";
