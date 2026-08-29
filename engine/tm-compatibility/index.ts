// Public entry point for the TM compatibility engine (TM SYSTEM PHASE 3).
//
// Answers exactly one question: for a given species/form id and move id, is
// there verified, official main-series machine (TM/TR) compatibility? The
// data (engine/tm-compatibility/data) is sourced systematically from PokeAPI
// per species/form — never hand-authored, never inferred from type, from a
// related/evolved species, or from what "seems logical" for that species.
// DENY-BY-DEFAULT: absence of an entry means incompatible, full stop — see
// canLearnTm's own doc comment.
//
// This is deliberately a separate dataset from engine/learnsets (which
// already has a "machine" LearningMethod kind in its own schema): with
// ~13,000 (species, move) compatibility facts across all 9 generations,
// interleaving them as individual entries into the existing per-species
// (Generation 1) and per-generation-monolith (Generation 2-9) learnset files
// would have meant thousands of repetitive, high-risk edits to files that
// already exist and are relied on elsewhere for level-up/egg/tutor/special
// data. Storing compatibility here instead — validated the same way, keyed
// by the exact same pokemonId/moveId space — keeps this system correct and
// reviewable without touching a single existing learnset entry (see the
// registry's own doc comment for how "unchanged" is enforced).
//
// External features must import from this barrel, never from
// engine/tm-compatibility/schemas, /validation, /registry, /queries, or
// /data directly — those are implementation details, same convention
// engine/moves and engine/learnsets already establish for their own barrels.

export type { TmMachineId, TmCompatibilityEntry } from "./types/tm-compatibility.types.ts";

export { tmMachineIdSchema, tmCompatibilityEntrySchema } from "./schemas/tm-compatibility-schema.ts";

export {
  validateTmCompatibilityEntry,
  validateTmCompatibilityList,
  TmCompatibilityValidationError,
} from "./validation/tm-compatibility-validation.ts";

export {
  buildTmCompatibilityRegistry,
  getAllTmCompatibilityEntries,
  getCompatibleMoveIdsForPokemon,
  hasTmCompatibilityData,
} from "./registry/tm-compatibility-registry.ts";

export { canLearnTm, getCompatibleTmMoveIds, toTmMachineId } from "./queries/tm-compatibility-queries.ts";
