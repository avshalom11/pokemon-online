import { GENERATION_1_LEARNSETS } from "./generation-1/index.ts";
import { GENERATION_2_LEARNSETS } from "./generation-2/index.ts";
import { GENERATION_3_LEARNSETS } from "./generation-3/index.ts";
import { GENERATION_4_LEARNSETS } from "./generation-4/index.ts";
import { GENERATION_5_LEARNSETS } from "./generation-5/index.ts";
import type { PokemonLearnset } from "../types/learnset.types.ts";

// Every generation's learnset data, concatenated. Adding a new generation
// means adding one entry here — the registry never changes.
export const ALL_LEARNSET_DEFINITIONS: PokemonLearnset[] = [
  ...GENERATION_1_LEARNSETS,
  ...GENERATION_2_LEARNSETS,
  ...GENERATION_3_LEARNSETS,
  ...GENERATION_4_LEARNSETS,
  ...GENERATION_5_LEARNSETS,
];
