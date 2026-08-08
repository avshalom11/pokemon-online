import type { Move } from "../../types/move.types.ts";

import { GENERATION_6_NORMAL_MOVES } from "./normal.moves.ts";
import { GENERATION_6_FIRE_MOVES } from "./fire.moves.ts";
import { GENERATION_6_WATER_MOVES } from "./water.moves.ts";
import { GENERATION_6_ELECTRIC_MOVES } from "./electric.moves.ts";
import { GENERATION_6_GRASS_MOVES } from "./grass.moves.ts";
import { GENERATION_6_ICE_MOVES } from "./ice.moves.ts";
import { GENERATION_6_FIGHTING_MOVES } from "./fighting.moves.ts";
import { GENERATION_6_POISON_MOVES } from "./poison.moves.ts";
import { GENERATION_6_GROUND_MOVES } from "./ground.moves.ts";
import { GENERATION_6_FLYING_MOVES } from "./flying.moves.ts";
import { GENERATION_6_PSYCHIC_MOVES } from "./psychic.moves.ts";
import { GENERATION_6_BUG_MOVES } from "./bug.moves.ts";
import { GENERATION_6_ROCK_MOVES } from "./rock.moves.ts";
import { GENERATION_6_GHOST_MOVES } from "./ghost.moves.ts";
import { GENERATION_6_DARK_MOVES } from "./dark.moves.ts";
import { GENERATION_6_STEEL_MOVES } from "./steel.moves.ts";
import { GENERATION_6_FAIRY_MOVES } from "./fairy.moves.ts";

// Generation 6 move definitions, split one file per Pokémon type — the same
// shape generation-1/2/3/4/5's own index.ts files already established. No
// generation-6/dragon.moves.ts exists because no new Dragon-type move was
// introduced in Generation 6 (Dragon Ascent is Flying type despite the
// name — see flying.moves.ts). Kalos Phase 3 scope: every one of these
// moves is new (verified by this generation's own completeness test
// against the full Generation 1-5 id list).
export const GENERATION_6_MOVES: Move[] = [
  ...GENERATION_6_NORMAL_MOVES,
  ...GENERATION_6_FIRE_MOVES,
  ...GENERATION_6_WATER_MOVES,
  ...GENERATION_6_ELECTRIC_MOVES,
  ...GENERATION_6_GRASS_MOVES,
  ...GENERATION_6_ICE_MOVES,
  ...GENERATION_6_FIGHTING_MOVES,
  ...GENERATION_6_POISON_MOVES,
  ...GENERATION_6_GROUND_MOVES,
  ...GENERATION_6_FLYING_MOVES,
  ...GENERATION_6_PSYCHIC_MOVES,
  ...GENERATION_6_BUG_MOVES,
  ...GENERATION_6_ROCK_MOVES,
  ...GENERATION_6_GHOST_MOVES,
  ...GENERATION_6_DARK_MOVES,
  ...GENERATION_6_STEEL_MOVES,
  ...GENERATION_6_FAIRY_MOVES,
];
