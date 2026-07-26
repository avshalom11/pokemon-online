import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Arcanine (#0059) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const ARCANINE_LEARNSET: PokemonLearnset = {
  pokemonId: "arcanine",
  generation: 1,
  entries: [
    { moveId: "agility", method: { kind: "level-up", level: 1 } },
    { moveId: "bite", method: { kind: "level-up", level: 1 } },
    { moveId: "ember", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "roar", method: { kind: "level-up", level: 1 } },
    { moveId: "take-down", method: { kind: "level-up", level: 1 } },
    { moveId: "flamethrower", method: { kind: "level-up", level: 5 } },
  ],
};
