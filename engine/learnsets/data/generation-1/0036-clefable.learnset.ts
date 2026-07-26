import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Clefable (#0036) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const CLEFABLE_LEARNSET: PokemonLearnset = {
  pokemonId: "clefable",
  generation: 1,
  entries: [
    { moveId: "defense-curl", method: { kind: "level-up", level: 1 } },
    { moveId: "double-slap", method: { kind: "level-up", level: 1 } },
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "metronome", method: { kind: "level-up", level: 1 } },
    { moveId: "minimize", method: { kind: "level-up", level: 1 } },
    { moveId: "pound", method: { kind: "level-up", level: 1 } },
    { moveId: "sing", method: { kind: "level-up", level: 1 } },
    { moveId: "splash", method: { kind: "level-up", level: 1 } },
  ],
};
