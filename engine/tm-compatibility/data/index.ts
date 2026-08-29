import { GENERATION_1_TM_COMPATIBILITY } from "./generation-1/index.ts";
import { GENERATION_2_TM_COMPATIBILITY } from "./generation-2/index.ts";
import { GENERATION_3_TM_COMPATIBILITY } from "./generation-3/index.ts";
import { GENERATION_4_TM_COMPATIBILITY } from "./generation-4/index.ts";
import { GENERATION_5_TM_COMPATIBILITY } from "./generation-5/index.ts";
import { GENERATION_6_TM_COMPATIBILITY } from "./generation-6/index.ts";
import { GENERATION_7_TM_COMPATIBILITY } from "./generation-7/index.ts";
import { GENERATION_8_TM_COMPATIBILITY } from "./generation-8/index.ts";
import { GENERATION_9_TM_COMPATIBILITY } from "./generation-9/index.ts";
import type { TmCompatibilityEntry } from "../types/tm-compatibility.types.ts";

// Every generation's TM compatibility data, concatenated — same "adding a
// new generation means adding one entry here, the registry never changes"
// convention engine/moves/data/index.ts and engine/learnsets/data/index.ts
// already establish. A species/form with no entry across every generation
// file below is deny-by-default incompatible with every TM (see
// ../queries/tm-compatibility-queries.ts's canLearnTm) — this is expected
// for species that genuinely have zero official machine compatibility with
// any of this project's 54 TM moves, not a gap.
export const ALL_TM_COMPATIBILITY_DEFINITIONS: TmCompatibilityEntry[] = [
  ...GENERATION_1_TM_COMPATIBILITY,
  ...GENERATION_2_TM_COMPATIBILITY,
  ...GENERATION_3_TM_COMPATIBILITY,
  ...GENERATION_4_TM_COMPATIBILITY,
  ...GENERATION_5_TM_COMPATIBILITY,
  ...GENERATION_6_TM_COMPATIBILITY,
  ...GENERATION_7_TM_COMPATIBILITY,
  ...GENERATION_8_TM_COMPATIBILITY,
  ...GENERATION_9_TM_COMPATIBILITY,
];
