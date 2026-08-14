import type { Move } from "../../types/move.types.ts";

import { GENERATION_9_NORMAL_MOVES } from "./normal.moves.ts";
import { GENERATION_9_GRASS_MOVES } from "./grass.moves.ts";
import { GENERATION_9_PSYCHIC_MOVES } from "./psychic.moves.ts";
import { GENERATION_9_FIRE_MOVES } from "./fire.moves.ts";
import { GENERATION_9_FIGHTING_MOVES } from "./fighting.moves.ts";
import { GENERATION_9_ELECTRIC_MOVES } from "./electric.moves.ts";
import { GENERATION_9_DARK_MOVES } from "./dark.moves.ts";
import { GENERATION_9_STEEL_MOVES } from "./steel.moves.ts";
import { GENERATION_9_GROUND_MOVES } from "./ground.moves.ts";
import { GENERATION_9_FLYING_MOVES } from "./flying.moves.ts";
import { GENERATION_9_WATER_MOVES } from "./water.moves.ts";
import { GENERATION_9_ROCK_MOVES } from "./rock.moves.ts";
import { GENERATION_9_POISON_MOVES } from "./poison.moves.ts";
import { GENERATION_9_DRAGON_MOVES } from "./dragon.moves.ts";
import { GENERATION_9_BUG_MOVES } from "./bug.moves.ts";

// Generation 9 (Paldea Moves & Learnsets Phase 3) move definitions, split one
// file per Pokémon type — the same shape Generation 2-8's own index.ts files
// already established. Only types with at least one genuinely new move get a
// file (same "no empty type file" rule Generation 8's own index.ts note
// established) — e.g. no generation-9/ice.moves.ts or fairy.moves.ts exists
// since no new Generation 9 move needed here belongs to those types.
//
// Scope: every move here debuted in Scarlet/Violet's own move pool,
// including The Teal Mask and The Indigo Disk DLC. Deliberately EXCLUDED:
// every Tera Blast type-specific variant (Tera Blast itself is representable
// as one ordinary Normal-type move, but this phase doesn't add it since no
// Paldea learnset in this file needs it and Terastallization itself is out
// of scope), every Max Move, and any move whose real mechanic depends on a
// Terastal/Dynamax battle-transformation state. Several moves below carry a
// real secondary clause this project's move-effect schema can't represent
// (a terrain/weather condition, a miss-triggered penalty, a temporary type
// change, a hazard-clear, a per-user dynamic type) — each was simplified by
// dropping only that unsupported clause and keeping the move's core
// damage/status data, the same policy Generation 8's Burning Jealousy
// already established; see each move's own description for the specific
// clause dropped.
export const GENERATION_9_MOVES: Move[] = [
  ...GENERATION_9_NORMAL_MOVES,
  ...GENERATION_9_GRASS_MOVES,
  ...GENERATION_9_PSYCHIC_MOVES,
  ...GENERATION_9_FIRE_MOVES,
  ...GENERATION_9_FIGHTING_MOVES,
  ...GENERATION_9_ELECTRIC_MOVES,
  ...GENERATION_9_DARK_MOVES,
  ...GENERATION_9_STEEL_MOVES,
  ...GENERATION_9_GROUND_MOVES,
  ...GENERATION_9_FLYING_MOVES,
  ...GENERATION_9_WATER_MOVES,
  ...GENERATION_9_ROCK_MOVES,
  ...GENERATION_9_POISON_MOVES,
  ...GENERATION_9_DRAGON_MOVES,
  ...GENERATION_9_BUG_MOVES,
];
