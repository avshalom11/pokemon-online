import type { Move } from "../../types/move.types.ts";

import { GENERATION_3_NORMAL_MOVES } from "./normal.moves.ts";
import { GENERATION_3_FIRE_MOVES } from "./fire.moves.ts";
import { GENERATION_3_WATER_MOVES } from "./water.moves.ts";
import { GENERATION_3_ELECTRIC_MOVES } from "./electric.moves.ts";
import { GENERATION_3_GRASS_MOVES } from "./grass.moves.ts";
import { GENERATION_3_ICE_MOVES } from "./ice.moves.ts";
import { GENERATION_3_FIGHTING_MOVES } from "./fighting.moves.ts";
import { GENERATION_3_POISON_MOVES } from "./poison.moves.ts";
import { GENERATION_3_GROUND_MOVES } from "./ground.moves.ts";
import { GENERATION_3_FLYING_MOVES } from "./flying.moves.ts";
import { GENERATION_3_PSYCHIC_MOVES } from "./psychic.moves.ts";
import { GENERATION_3_BUG_MOVES } from "./bug.moves.ts";
import { GENERATION_3_ROCK_MOVES } from "./rock.moves.ts";
import { GENERATION_3_GHOST_MOVES } from "./ghost.moves.ts";
import { GENERATION_3_DRAGON_MOVES } from "./dragon.moves.ts";
import { GENERATION_3_DARK_MOVES } from "./dark.moves.ts";
import { GENERATION_3_STEEL_MOVES } from "./steel.moves.ts";

// Generation 3 move definitions, split one file per Pokémon type — the same
// shape generation-1/index.ts and generation-2/index.ts already established.
// No generation-3/fairy.moves.ts exists because no move introduced in
// Generation 3 is Fairy-typed (Fairy didn't exist as a type until Generation
// 6) — same "only the types that actually need a file get one" rule
// generation-2/index.ts's own doc comment already documents. Silver Wind
// (canonically a Generation 3 move) is deliberately absent here — it
// already exists as a Generation 2 entry in this project's own catalog
// (engine/moves/data/generation-2/bug.moves.ts), and this database never
// defines the same move id twice.
export const GENERATION_3_MOVES: Move[] = [
  ...GENERATION_3_NORMAL_MOVES,
  ...GENERATION_3_FIRE_MOVES,
  ...GENERATION_3_WATER_MOVES,
  ...GENERATION_3_ELECTRIC_MOVES,
  ...GENERATION_3_GRASS_MOVES,
  ...GENERATION_3_ICE_MOVES,
  ...GENERATION_3_FIGHTING_MOVES,
  ...GENERATION_3_POISON_MOVES,
  ...GENERATION_3_GROUND_MOVES,
  ...GENERATION_3_FLYING_MOVES,
  ...GENERATION_3_PSYCHIC_MOVES,
  ...GENERATION_3_BUG_MOVES,
  ...GENERATION_3_ROCK_MOVES,
  ...GENERATION_3_GHOST_MOVES,
  ...GENERATION_3_DRAGON_MOVES,
  ...GENERATION_3_DARK_MOVES,
  ...GENERATION_3_STEEL_MOVES,
];
