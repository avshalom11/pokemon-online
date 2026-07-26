import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Shellder (#0090) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const SHELLDER_LEARNSET: PokemonLearnset = {
  pokemonId: "shellder",
  generation: 1,
  entries: [
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
    { moveId: "withdraw", method: { kind: "level-up", level: 4 } },
    { moveId: "leer", method: { kind: "level-up", level: 12 } },
    { moveId: "supersonic", method: { kind: "level-up", level: 20 } },
    { moveId: "aurora-beam", method: { kind: "level-up", level: 24 } },
    { moveId: "clamp", method: { kind: "level-up", level: 25 } },
    { moveId: "ice-beam", method: { kind: "level-up", level: 40 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 48 } },
  ],
};
