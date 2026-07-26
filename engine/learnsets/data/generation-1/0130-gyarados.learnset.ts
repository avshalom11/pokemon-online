import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Gyarados (#0130) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const GYARADOS_LEARNSET: PokemonLearnset = {
  pokemonId: "gyarados",
  generation: 1,
  entries: [
    { moveId: "bite", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "splash", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "waterfall", method: { kind: "level-up", level: 21 } },
    { moveId: "dragon-rage", method: { kind: "level-up", level: 36 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 40 } },
    { moveId: "thrash", method: { kind: "level-up", level: 48 } },
    { moveId: "hyper-beam", method: { kind: "level-up", level: 52 } },
  ],
};
