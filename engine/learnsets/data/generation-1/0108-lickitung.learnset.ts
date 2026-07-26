import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Lickitung (#0108) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const LICKITUNG_LEARNSET: PokemonLearnset = {
  pokemonId: "lickitung",
  generation: 1,
  entries: [
    { moveId: "defense-curl", method: { kind: "level-up", level: 1 } },
    { moveId: "lick", method: { kind: "level-up", level: 1 } },
    { moveId: "supersonic", method: { kind: "level-up", level: 12 } },
    { moveId: "wrap", method: { kind: "level-up", level: 18 } },
    { moveId: "disable", method: { kind: "level-up", level: 24 } },
    { moveId: "stomp", method: { kind: "level-up", level: 30 } },
    { moveId: "screech", method: { kind: "level-up", level: 42 } },
    { moveId: "slam", method: { kind: "level-up", level: 48 } },
  ],
};
