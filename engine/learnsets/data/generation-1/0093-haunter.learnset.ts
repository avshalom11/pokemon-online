import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Haunter (#0093) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const HAUNTER_LEARNSET: PokemonLearnset = {
  pokemonId: "haunter",
  generation: 1,
  entries: [
    { moveId: "confuse-ray", method: { kind: "level-up", level: 1 } },
    { moveId: "hypnosis", method: { kind: "level-up", level: 1 } },
    { moveId: "lick", method: { kind: "level-up", level: 1 } },
    { moveId: "night-shade", method: { kind: "level-up", level: 30 } },
    { moveId: "dream-eater", method: { kind: "level-up", level: 60 } },
  ],
};
