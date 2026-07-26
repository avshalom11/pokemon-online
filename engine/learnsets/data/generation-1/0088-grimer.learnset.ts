import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Grimer (#0088) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const GRIMER_LEARNSET: PokemonLearnset = {
  pokemonId: "grimer",
  generation: 1,
  entries: [
    { moveId: "poison-gas", method: { kind: "level-up", level: 1 } },
    { moveId: "pound", method: { kind: "level-up", level: 1 } },
    { moveId: "harden", method: { kind: "level-up", level: 4 } },
    { moveId: "disable", method: { kind: "level-up", level: 12 } },
    { moveId: "sludge", method: { kind: "level-up", level: 15 } },
    { moveId: "minimize", method: { kind: "level-up", level: 21 } },
    { moveId: "toxic", method: { kind: "level-up", level: 26 } },
    { moveId: "screech", method: { kind: "level-up", level: 37 } },
    { moveId: "acid-armor", method: { kind: "level-up", level: 43 } },
  ],
};
