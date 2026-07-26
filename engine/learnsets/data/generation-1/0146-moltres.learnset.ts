import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Moltres (#0146) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const MOLTRES_LEARNSET: PokemonLearnset = {
  pokemonId: "moltres",
  generation: 1,
  entries: [
    { moveId: "gust", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "ember", method: { kind: "level-up", level: 5 } },
    { moveId: "fire-spin", method: { kind: "level-up", level: 8 } },
    { moveId: "wing-attack", method: { kind: "level-up", level: 15 } },
    { moveId: "agility", method: { kind: "level-up", level: 20 } },
    { moveId: "flamethrower", method: { kind: "level-up", level: 36 } },
    { moveId: "sky-attack", method: { kind: "level-up", level: 70 } },
    { moveId: "solar-beam", method: { kind: "level-up", level: 71 } },
  ],
};
