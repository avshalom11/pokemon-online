import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Magnemite (#0081) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const MAGNEMITE_LEARNSET: PokemonLearnset = {
  pokemonId: "magnemite",
  generation: 1,
  entries: [
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
    { moveId: "supersonic", method: { kind: "level-up", level: 4 } },
    { moveId: "thunder-wave", method: { kind: "level-up", level: 8 } },
    { moveId: "sonic-boom", method: { kind: "level-up", level: 17 } },
    { moveId: "screech", method: { kind: "level-up", level: 24 } },
    { moveId: "swift", method: { kind: "level-up", level: 38 } },
    { moveId: "light-screen", method: { kind: "level-up", level: 44 } },
  ],
};
