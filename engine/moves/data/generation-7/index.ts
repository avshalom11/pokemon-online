import type { Move } from "../../types/move.types.ts";

import { GENERATION_7_NORMAL_MOVES } from "./normal.moves.ts";
import { GENERATION_7_FIRE_MOVES } from "./fire.moves.ts";
import { GENERATION_7_WATER_MOVES } from "./water.moves.ts";
import { GENERATION_7_ELECTRIC_MOVES } from "./electric.moves.ts";
import { GENERATION_7_GRASS_MOVES } from "./grass.moves.ts";
import { GENERATION_7_ICE_MOVES } from "./ice.moves.ts";
import { GENERATION_7_POISON_MOVES } from "./poison.moves.ts";
import { GENERATION_7_GROUND_MOVES } from "./ground.moves.ts";
import { GENERATION_7_FLYING_MOVES } from "./flying.moves.ts";
import { GENERATION_7_PSYCHIC_MOVES } from "./psychic.moves.ts";
import { GENERATION_7_BUG_MOVES } from "./bug.moves.ts";
import { GENERATION_7_ROCK_MOVES } from "./rock.moves.ts";
import { GENERATION_7_GHOST_MOVES } from "./ghost.moves.ts";
import { GENERATION_7_DRAGON_MOVES } from "./dragon.moves.ts";
import { GENERATION_7_DARK_MOVES } from "./dark.moves.ts";
import { GENERATION_7_STEEL_MOVES } from "./steel.moves.ts";
import { GENERATION_7_FAIRY_MOVES } from "./fairy.moves.ts";

// Generation 7 (Alola Moves & Learnsets Phase 3) move definitions, split
// one file per Pokémon type — the same shape Generation 2-6's own index.ts
// files already established. No generation-7/fighting.moves.ts exists
// because no new Fighting-type move was introduced in Generation 7. Every
// move here is genuinely new in Sun/Moon or Ultra Sun/Ultra Moon (verified
// by this generation's own completeness test against the full Generation
// 1-6 id list) — no Z-Move-exclusive move (e.g. Sinister Arrow Raid,
// Guardian of Alola, every generic type Z-Move) and no Generation 8+ move
// is included; see this folder's own completeness test for the full
// rationale.
export const GENERATION_7_MOVES: Move[] = [
  ...GENERATION_7_NORMAL_MOVES,
  ...GENERATION_7_FIRE_MOVES,
  ...GENERATION_7_WATER_MOVES,
  ...GENERATION_7_ELECTRIC_MOVES,
  ...GENERATION_7_GRASS_MOVES,
  ...GENERATION_7_ICE_MOVES,
  ...GENERATION_7_POISON_MOVES,
  ...GENERATION_7_GROUND_MOVES,
  ...GENERATION_7_FLYING_MOVES,
  ...GENERATION_7_PSYCHIC_MOVES,
  ...GENERATION_7_BUG_MOVES,
  ...GENERATION_7_ROCK_MOVES,
  ...GENERATION_7_GHOST_MOVES,
  ...GENERATION_7_DRAGON_MOVES,
  ...GENERATION_7_DARK_MOVES,
  ...GENERATION_7_STEEL_MOVES,
  ...GENERATION_7_FAIRY_MOVES,
];
