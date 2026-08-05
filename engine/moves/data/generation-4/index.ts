import type { Move } from "../../types/move.types.ts";

import { GENERATION_4_NORMAL_MOVES } from "./normal.moves.ts";
import { GENERATION_4_FIRE_MOVES } from "./fire.moves.ts";
import { GENERATION_4_WATER_MOVES } from "./water.moves.ts";
import { GENERATION_4_ELECTRIC_MOVES } from "./electric.moves.ts";
import { GENERATION_4_GRASS_MOVES } from "./grass.moves.ts";
import { GENERATION_4_ICE_MOVES } from "./ice.moves.ts";
import { GENERATION_4_FIGHTING_MOVES } from "./fighting.moves.ts";
import { GENERATION_4_POISON_MOVES } from "./poison.moves.ts";
import { GENERATION_4_GROUND_MOVES } from "./ground.moves.ts";
import { GENERATION_4_FLYING_MOVES } from "./flying.moves.ts";
import { GENERATION_4_PSYCHIC_MOVES } from "./psychic.moves.ts";
import { GENERATION_4_BUG_MOVES } from "./bug.moves.ts";
import { GENERATION_4_ROCK_MOVES } from "./rock.moves.ts";
import { GENERATION_4_GHOST_MOVES } from "./ghost.moves.ts";
import { GENERATION_4_DRAGON_MOVES } from "./dragon.moves.ts";
import { GENERATION_4_DARK_MOVES } from "./dark.moves.ts";
import { GENERATION_4_STEEL_MOVES } from "./steel.moves.ts";

// Generation 4 move definitions, split one file per Pokémon type — the same
// shape generation-1/2/3's own index.ts files already established. No
// generation-4/fairy.moves.ts exists because Fairy didn't exist as a type
// until Generation 6 — same rule generation-3/index.ts's own doc comment
// already documents. All 113 official Generation 4 moves (National Dex move
// numbers #355-#467) are new — none collide with an existing Generation 1-3
// move id (verified by this generation's own completeness test), so unlike
// generation-3/index.ts's Silver Wind case, nothing here is skipped.
export const GENERATION_4_MOVES: Move[] = [
  ...GENERATION_4_NORMAL_MOVES,
  ...GENERATION_4_FIRE_MOVES,
  ...GENERATION_4_WATER_MOVES,
  ...GENERATION_4_ELECTRIC_MOVES,
  ...GENERATION_4_GRASS_MOVES,
  ...GENERATION_4_ICE_MOVES,
  ...GENERATION_4_FIGHTING_MOVES,
  ...GENERATION_4_POISON_MOVES,
  ...GENERATION_4_GROUND_MOVES,
  ...GENERATION_4_FLYING_MOVES,
  ...GENERATION_4_PSYCHIC_MOVES,
  ...GENERATION_4_BUG_MOVES,
  ...GENERATION_4_ROCK_MOVES,
  ...GENERATION_4_GHOST_MOVES,
  ...GENERATION_4_DRAGON_MOVES,
  ...GENERATION_4_DARK_MOVES,
  ...GENERATION_4_STEEL_MOVES,
];
