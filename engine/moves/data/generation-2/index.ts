import type { Move } from "../../types/move.types.ts";

import { GENERATION_2_NORMAL_MOVES } from "./normal.moves.ts";
import { GENERATION_2_FIGHTING_MOVES } from "./fighting.moves.ts";
import { GENERATION_2_DARK_MOVES } from "./dark.moves.ts";
// Steel and Fairy have no Generation 1 sibling file — this is the first
// move data for either type in this project (Generation 1 predates both as
// playable types; Fairy didn't exist at all until Generation 6, but Charm's
// modern type is Fairy — see that file's own doc comment).
import { GENERATION_2_STEEL_MOVES } from "./steel.moves.ts";
import { GENERATION_2_FAIRY_MOVES } from "./fairy.moves.ts";
import { GENERATION_2_ICE_MOVES } from "./ice.moves.ts";
import { GENERATION_2_ROCK_MOVES } from "./rock.moves.ts";
import { GENERATION_2_WATER_MOVES } from "./water.moves.ts";
import { GENERATION_2_ELECTRIC_MOVES } from "./electric.moves.ts";
import { GENERATION_2_DRAGON_MOVES } from "./dragon.moves.ts";
import { GENERATION_2_GHOST_MOVES } from "./ghost.moves.ts";
import { GENERATION_2_BUG_MOVES } from "./bug.moves.ts";
import { GENERATION_2_GROUND_MOVES } from "./ground.moves.ts";
import { GENERATION_2_FIRE_MOVES } from "./fire.moves.ts";
import { GENERATION_2_GRASS_MOVES } from "./grass.moves.ts";

// Generation 2 move definitions, split one file per Pokémon type — the
// same shape generation-1/index.ts already established. Only the types
// that actually needed a new Generation 2 move get a file here (e.g. no
// generation-2/psychic.moves.ts exists because every Johto learnset's
// Psychic-type needs are already covered by Generation 1's psychic.moves.ts
// — see engine/learnsets/data/generation-2's own doc comment for the full
// "reuse Generation 1 moves wherever the real learnset already needs one"
// rule this data follows).
export const GENERATION_2_MOVES: Move[] = [
  ...GENERATION_2_NORMAL_MOVES,
  ...GENERATION_2_FIGHTING_MOVES,
  ...GENERATION_2_DARK_MOVES,
  ...GENERATION_2_STEEL_MOVES,
  ...GENERATION_2_FAIRY_MOVES,
  ...GENERATION_2_ICE_MOVES,
  ...GENERATION_2_ROCK_MOVES,
  ...GENERATION_2_WATER_MOVES,
  ...GENERATION_2_ELECTRIC_MOVES,
  ...GENERATION_2_DRAGON_MOVES,
  ...GENERATION_2_GHOST_MOVES,
  ...GENERATION_2_BUG_MOVES,
  ...GENERATION_2_GROUND_MOVES,
  ...GENERATION_2_FIRE_MOVES,
  ...GENERATION_2_GRASS_MOVES,
];
