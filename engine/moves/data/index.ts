import { GENERATION_1_MOVES } from "./generation-1/index.ts";
import { GENERATION_2_MOVES } from "./generation-2/index.ts";
import type { Move } from "../types/move.types.ts";

// Every generation's move data, concatenated. Adding a new generation means
// adding one entry here — the registry never changes.
export const ALL_MOVE_DEFINITIONS: Move[] = [...GENERATION_1_MOVES, ...GENERATION_2_MOVES];
