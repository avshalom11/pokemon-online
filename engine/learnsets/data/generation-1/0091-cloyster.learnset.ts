import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Cloyster (#0091) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const CLOYSTER_LEARNSET: PokemonLearnset = {
  pokemonId: "cloyster",
  generation: 1,
  entries: [
    { moveId: "aurora-beam", method: { kind: "level-up", level: 1 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 1 } },
    { moveId: "ice-beam", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "supersonic", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
    { moveId: "withdraw", method: { kind: "level-up", level: 1 } },
    { moveId: "spike-cannon", method: { kind: "level-up", level: 13 } },
  ],
};
