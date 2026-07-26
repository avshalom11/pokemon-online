import type { Move } from "../../types/move.types.ts";

import { GENERATION_1_NORMAL_MOVES } from "./normal.moves.ts";
import { GENERATION_1_FIRE_MOVES } from "./fire.moves.ts";
import { GENERATION_1_WATER_MOVES } from "./water.moves.ts";
import { GENERATION_1_ELECTRIC_MOVES } from "./electric.moves.ts";
import { GENERATION_1_GRASS_MOVES } from "./grass.moves.ts";
import { GENERATION_1_ICE_MOVES } from "./ice.moves.ts";
import { GENERATION_1_FIGHTING_MOVES } from "./fighting.moves.ts";
import { GENERATION_1_POISON_MOVES } from "./poison.moves.ts";
import { GENERATION_1_GROUND_MOVES } from "./ground.moves.ts";
import { GENERATION_1_FLYING_MOVES } from "./flying.moves.ts";
import { GENERATION_1_PSYCHIC_MOVES } from "./psychic.moves.ts";
import { GENERATION_1_BUG_MOVES } from "./bug.moves.ts";
import { GENERATION_1_ROCK_MOVES } from "./rock.moves.ts";
import { GENERATION_1_GHOST_MOVES } from "./ghost.moves.ts";
import { GENERATION_1_DRAGON_MOVES } from "./dragon.moves.ts";
// Dark wasn't a playable type until Generation 2. Bite is the sole
// Generation 1 move whose modern type differs from its original-release
// type (Normal at launch, retyped to Dark once the type existed) — see the
// note atop dark.moves.ts. One extra file beyond the phase spec's listed
// 15 type files, added so Bite lives with the type its own `type` field
// says it is, exactly like every other move in this database.
import { GENERATION_1_DARK_MOVES } from "./dark.moves.ts";

// Generation 1 move definitions, split one file per Pokémon type (plus
// dark.moves.ts — see above) so no single file holds all 165 moves. Each
// future generation gets its own sibling folder (generation-2/,
// generation-3/, ...) following this same shape, so adding a generation
// never means touching the engine.
export const GENERATION_1_MOVES: Move[] = [
  ...GENERATION_1_NORMAL_MOVES,
  ...GENERATION_1_FIRE_MOVES,
  ...GENERATION_1_WATER_MOVES,
  ...GENERATION_1_ELECTRIC_MOVES,
  ...GENERATION_1_GRASS_MOVES,
  ...GENERATION_1_ICE_MOVES,
  ...GENERATION_1_FIGHTING_MOVES,
  ...GENERATION_1_POISON_MOVES,
  ...GENERATION_1_GROUND_MOVES,
  ...GENERATION_1_FLYING_MOVES,
  ...GENERATION_1_PSYCHIC_MOVES,
  ...GENERATION_1_BUG_MOVES,
  ...GENERATION_1_ROCK_MOVES,
  ...GENERATION_1_GHOST_MOVES,
  ...GENERATION_1_DRAGON_MOVES,
  ...GENERATION_1_DARK_MOVES,
];
