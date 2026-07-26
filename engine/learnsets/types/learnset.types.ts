// Public type surface for the learnset engine. The zod schemas in
// ../schemas are the source of truth (types are inferred via z.infer) so
// the runtime validator and the compile-time type can never drift apart —
// this file just re-exports the plain TypeScript names, the same pattern
// engine/moves/types/move.types.ts uses.
export type {
  PokemonLearnset,
  PokemonLearnsetId,
  LearnsetEntry,
  LearningMethod,
  MachineType,
} from "../schemas/learnset-schema.ts";
