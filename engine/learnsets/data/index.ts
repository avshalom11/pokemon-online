import { GENERATION_1_LEARNSETS } from "./generation-1/index.ts";
import { GENERATION_2_LEARNSETS } from "./generation-2/index.ts";
import type { PokemonLearnset } from "../types/learnset.types.ts";

// Every generation's learnset data, concatenated. Adding a new generation
// means adding one entry here — the registry never changes.
export const ALL_LEARNSET_DEFINITIONS: PokemonLearnset[] = [...GENERATION_1_LEARNSETS, ...GENERATION_2_LEARNSETS];
