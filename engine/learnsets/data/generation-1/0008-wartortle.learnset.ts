import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Wartortle (#0008) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const WARTORTLE_LEARNSET: PokemonLearnset = {
  pokemonId: "wartortle",
  generation: 1,
  entries: [
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
    { moveId: "withdraw", method: { kind: "level-up", level: 1 } },
    { moveId: "bite", method: { kind: "level-up", level: 12 } },
    { moveId: "bubble", method: { kind: "level-up", level: 13 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 45 } },
    { moveId: "skull-bash", method: { kind: "level-up", level: 50 } },
  ],
};
