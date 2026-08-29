// Public type surface for the TM compatibility engine. The zod schema in
// ../schemas is the source of truth (types are inferred via z.infer) so the
// runtime validator and the compile-time type can never drift apart — same
// pattern engine/moves/types/move.types.ts and
// engine/learnsets/types/learnset.types.ts already use.
export type { TmMachineId, TmCompatibilityEntry } from "../schemas/tm-compatibility-schema.ts";
