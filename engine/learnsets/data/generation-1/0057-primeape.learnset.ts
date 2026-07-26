import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Primeape (#0057) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const PRIMEAPE_LEARNSET: PokemonLearnset = {
  pokemonId: "primeape",
  generation: 1,
  entries: [
    { moveId: "focus-energy", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "rage", method: { kind: "level-up", level: 1 } },
    { moveId: "scratch", method: { kind: "level-up", level: 1 } },
    { moveId: "fury-swipes", method: { kind: "level-up", level: 5 } },
    { moveId: "karate-chop", method: { kind: "level-up", level: 8 } },
    { moveId: "low-kick", method: { kind: "level-up", level: 8 } },
    { moveId: "seismic-toss", method: { kind: "level-up", level: 15 } },
    { moveId: "thrash", method: { kind: "level-up", level: 30 } },
    { moveId: "screech", method: { kind: "level-up", level: 44 } },
  ],
};
