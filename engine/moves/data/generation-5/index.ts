import type { Move } from "../../types/move.types.ts";

import { GENERATION_5_NORMAL_MOVES } from "./normal.moves.ts";
import { GENERATION_5_FIRE_MOVES } from "./fire.moves.ts";
import { GENERATION_5_WATER_MOVES } from "./water.moves.ts";
import { GENERATION_5_ELECTRIC_MOVES } from "./electric.moves.ts";
import { GENERATION_5_GRASS_MOVES } from "./grass.moves.ts";
import { GENERATION_5_ICE_MOVES } from "./ice.moves.ts";
import { GENERATION_5_FIGHTING_MOVES } from "./fighting.moves.ts";
import { GENERATION_5_POISON_MOVES } from "./poison.moves.ts";
import { GENERATION_5_GROUND_MOVES } from "./ground.moves.ts";
import { GENERATION_5_FLYING_MOVES } from "./flying.moves.ts";
import { GENERATION_5_PSYCHIC_MOVES } from "./psychic.moves.ts";
import { GENERATION_5_BUG_MOVES } from "./bug.moves.ts";
import { GENERATION_5_ROCK_MOVES } from "./rock.moves.ts";
import { GENERATION_5_GHOST_MOVES } from "./ghost.moves.ts";
import { GENERATION_5_DRAGON_MOVES } from "./dragon.moves.ts";
import { GENERATION_5_DARK_MOVES } from "./dark.moves.ts";
import { GENERATION_5_STEEL_MOVES } from "./steel.moves.ts";

// Generation 5 move definitions, split one file per Pokémon type — the same
// shape generation-1/2/3/4's own index.ts files already established. No
// generation-5/fairy.moves.ts exists because Fairy didn't exist as a type
// until Generation 6 — same rule generation-3/index.ts's own doc comment
// already documents. Unova Phase 3 scope: every one of these moves is new
// (verified by this generation's own completeness test against the full
// Generation 1-4 id list), so nothing here is skipped for a collision.
export const GENERATION_5_MOVES: Move[] = [
  ...GENERATION_5_NORMAL_MOVES,
  ...GENERATION_5_FIRE_MOVES,
  ...GENERATION_5_WATER_MOVES,
  ...GENERATION_5_ELECTRIC_MOVES,
  ...GENERATION_5_GRASS_MOVES,
  ...GENERATION_5_ICE_MOVES,
  ...GENERATION_5_FIGHTING_MOVES,
  ...GENERATION_5_POISON_MOVES,
  ...GENERATION_5_GROUND_MOVES,
  ...GENERATION_5_FLYING_MOVES,
  ...GENERATION_5_PSYCHIC_MOVES,
  ...GENERATION_5_BUG_MOVES,
  ...GENERATION_5_ROCK_MOVES,
  ...GENERATION_5_GHOST_MOVES,
  ...GENERATION_5_DRAGON_MOVES,
  ...GENERATION_5_DARK_MOVES,
  ...GENERATION_5_STEEL_MOVES,
];
