import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Lapras (#0131) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const LAPRAS_LEARNSET: PokemonLearnset = {
  pokemonId: "lapras",
  generation: 1,
  entries: [
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
    { moveId: "sing", method: { kind: "level-up", level: 5 } },
    { moveId: "mist", method: { kind: "level-up", level: 10 } },
    { moveId: "confuse-ray", method: { kind: "level-up", level: 25 } },
    { moveId: "body-slam", method: { kind: "level-up", level: 40 } },
    { moveId: "ice-beam", method: { kind: "level-up", level: 45 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 55 } },
  ],
};
