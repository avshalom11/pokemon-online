import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Horsea (#0116) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const HORSEA_LEARNSET: PokemonLearnset = {
  pokemonId: "horsea",
  generation: 1,
  entries: [
    { moveId: "bubble", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
    { moveId: "smokescreen", method: { kind: "level-up", level: 5 } },
    { moveId: "focus-energy", method: { kind: "level-up", level: 15 } },
    { moveId: "bubble-beam", method: { kind: "level-up", level: 25 } },
    { moveId: "agility", method: { kind: "level-up", level: 30 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 45 } },
  ],
};
