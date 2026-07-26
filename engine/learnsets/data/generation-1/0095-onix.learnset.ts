import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Onix (#0095) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const ONIX_LEARNSET: PokemonLearnset = {
  pokemonId: "onix",
  generation: 1,
  entries: [
    { moveId: "bind", method: { kind: "level-up", level: 1 } },
    { moveId: "harden", method: { kind: "level-up", level: 1 } },
    { moveId: "rock-throw", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "rage", method: { kind: "level-up", level: 13 } },
    { moveId: "rock-slide", method: { kind: "level-up", level: 20 } },
    { moveId: "screech", method: { kind: "level-up", level: 24 } },
    { moveId: "slam", method: { kind: "level-up", level: 36 } },
    { moveId: "dig", method: { kind: "level-up", level: 44 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 56 } },
  ],
};
