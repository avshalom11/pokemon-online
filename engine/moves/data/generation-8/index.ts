import type { Move } from "../../types/move.types.ts";

import { GENERATION_8_NORMAL_MOVES } from "./normal.moves.ts";
import { GENERATION_8_FIRE_MOVES } from "./fire.moves.ts";
import { GENERATION_8_WATER_MOVES } from "./water.moves.ts";
import { GENERATION_8_ELECTRIC_MOVES } from "./electric.moves.ts";
import { GENERATION_8_GRASS_MOVES } from "./grass.moves.ts";
import { GENERATION_8_ICE_MOVES } from "./ice.moves.ts";
import { GENERATION_8_FIGHTING_MOVES } from "./fighting.moves.ts";
import { GENERATION_8_POISON_MOVES } from "./poison.moves.ts";
import { GENERATION_8_GROUND_MOVES } from "./ground.moves.ts";
import { GENERATION_8_FLYING_MOVES } from "./flying.moves.ts";
import { GENERATION_8_PSYCHIC_MOVES } from "./psychic.moves.ts";
import { GENERATION_8_BUG_MOVES } from "./bug.moves.ts";
import { GENERATION_8_ROCK_MOVES } from "./rock.moves.ts";
import { GENERATION_8_GHOST_MOVES } from "./ghost.moves.ts";
import { GENERATION_8_DRAGON_MOVES } from "./dragon.moves.ts";
import { GENERATION_8_DARK_MOVES } from "./dark.moves.ts";
import { GENERATION_8_STEEL_MOVES } from "./steel.moves.ts";
import { GENERATION_8_FAIRY_MOVES } from "./fairy.moves.ts";

// Generation 8 (Galar Moves & Learnsets Phase 3) move definitions, split one
// file per Pokémon type — the same shape Generation 2-7's own index.ts files
// already established. No generation-8/ground.moves.ts... (a file DOES
// exist, one move) — every type folder present here has at least one
// genuinely new Sword/Shield-era move; a type with zero new Generation 8
// moves (e.g. no new Generation 8 Fire move beyond the two listed) simply
// isn't imported.
//
// Scope: every move here debuted in Sword/Shield's own move pool, including
// Isle of Armor and Crown Tundra DLC (verified against this generation's own
// completeness test — each carries "sword-shield" as one of its real
// version groups). Deliberately EXCLUDED: all 19 Max Moves (Max Airstream
// through Max Wyrmwind — a Dynamax-only battle transformation, never an
// ordinary learnable move) and every move that debuted in Pokémon Legends:
// Arceus or Scarlet/Violet without ever appearing in Sword/Shield (e.g.
// Ceaseless Edge, Wave Crash, Triple Arrows, Stone Axe — see this folder's
// own completeness test for the full excluded list and sourcing).
export const GENERATION_8_MOVES: Move[] = [
  ...GENERATION_8_NORMAL_MOVES,
  ...GENERATION_8_FIRE_MOVES,
  ...GENERATION_8_WATER_MOVES,
  ...GENERATION_8_ELECTRIC_MOVES,
  ...GENERATION_8_GRASS_MOVES,
  ...GENERATION_8_ICE_MOVES,
  ...GENERATION_8_FIGHTING_MOVES,
  ...GENERATION_8_POISON_MOVES,
  ...GENERATION_8_GROUND_MOVES,
  ...GENERATION_8_FLYING_MOVES,
  ...GENERATION_8_PSYCHIC_MOVES,
  ...GENERATION_8_BUG_MOVES,
  ...GENERATION_8_ROCK_MOVES,
  ...GENERATION_8_GHOST_MOVES,
  ...GENERATION_8_DRAGON_MOVES,
  ...GENERATION_8_DARK_MOVES,
  ...GENERATION_8_STEEL_MOVES,
  ...GENERATION_8_FAIRY_MOVES,
];
