import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Omastar (#0139) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const OMASTAR_LEARNSET: PokemonLearnset = {
  pokemonId: "omastar",
  generation: 1,
  entries: [
    { moveId: "bind", method: { kind: "level-up", level: 1 } },
    { moveId: "bite", method: { kind: "level-up", level: 1 } },
    { moveId: "constrict", method: { kind: "level-up", level: 1 } },
    { moveId: "sand-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "spike-cannon", method: { kind: "level-up", level: 1 } },
    { moveId: "withdraw", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 15 } },
    { moveId: "leer", method: { kind: "level-up", level: 20 } },
    { moveId: "surf", method: { kind: "level-up", level: 56 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 70 } },
  ],
};
