// Public entry point for the learnset engine. Phase 4A built the
// architecture; Phase 4B populated all 151 Generation 1 species with
// level-up learnsets. Nothing here touches PlayerPokemon, "known moves",
// or the eventual four-active-move limit (that's Phase 4C/4D).
//
// IMPORTANT: the populated Generation 1 level-up data is MODERN
// (current-generation) learnset data, filtered to moves that exist in
// this project's move database — it is NOT the original 1996 Red/Blue/
// Yellow learnsets, and levels/move sets can differ from 1996 as a
// result. See the full explanation at the top of
// engine/learnsets/data/generation-1/index.ts before assuming historical
// accuracy.
//
// External features must import from this barrel, never from
// engine/learnsets/schemas, /validation, /registry, /queries, or /data
// directly — those are implementation details.

export type {
  PokemonLearnset,
  PokemonLearnsetId,
  LearnsetEntry,
  LearningMethod,
  MachineType,
} from "./types/learnset.types.ts";

export {
  pokemonLearnsetSchema,
  learnsetEntrySchema,
  learningMethodSchema,
  pokemonIdSchema,
  machineTypeSchema,
  machineIdSchema,
  versionGroupSchema,
} from "./schemas/learnset-schema.ts";

export { validateLearnset, validateLearnsetList, LearnsetValidationError } from "./validation/learnset-validation.ts";

export {
  buildLearnsetRegistry,
  getAllLearnsets,
  getLearnsetByPokemonId,
  hasLearnset,
} from "./registry/learnset-registry.ts";

export {
  getLearnsetEntries,
  getLevelUpEntries,
  getMachineEntries,
  getTutorEntries,
  getEggEntries,
  getSpecialEntries,
  getMovesLearnedAtLevel,
  getMovesLearnedBetweenLevels,
  getAvailableLevelUpMovesAtLevel,
  getStartingMoves,
} from "./queries/learnset-queries.ts";
