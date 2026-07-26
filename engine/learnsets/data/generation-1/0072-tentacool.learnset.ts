import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Tentacool (#0072) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const TENTACOOL_LEARNSET: PokemonLearnset = {
  pokemonId: "tentacool",
  generation: 1,
  entries: [
    { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
    { moveId: "acid", method: { kind: "level-up", level: 4 } },
    { moveId: "constrict", method: { kind: "level-up", level: 7 } },
    { moveId: "wrap", method: { kind: "level-up", level: 8 } },
    { moveId: "supersonic", method: { kind: "level-up", level: 12 } },
    { moveId: "screech", method: { kind: "level-up", level: 20 } },
    { moveId: "bubble-beam", method: { kind: "level-up", level: 24 } },
    { moveId: "barrier", method: { kind: "level-up", level: 28 } },
    { moveId: "acid-armor", method: { kind: "level-up", level: 32 } },
    { moveId: "surf", method: { kind: "level-up", level: 40 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 48 } },
  ],
};
