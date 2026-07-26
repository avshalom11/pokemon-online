import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Staryu (#0120) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const STARYU_LEARNSET: PokemonLearnset = {
  pokemonId: "staryu",
  generation: 1,
  entries: [
    { moveId: "harden", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 4 } },
    { moveId: "confuse-ray", method: { kind: "level-up", level: 8 } },
    { moveId: "psywave", method: { kind: "level-up", level: 13 } },
    { moveId: "minimize", method: { kind: "level-up", level: 16 } },
    { moveId: "bubble-beam", method: { kind: "level-up", level: 18 } },
    { moveId: "swift", method: { kind: "level-up", level: 20 } },
    { moveId: "psybeam", method: { kind: "level-up", level: 24 } },
    { moveId: "light-screen", method: { kind: "level-up", level: 32 } },
    { moveId: "psychic", method: { kind: "level-up", level: 40 } },
    { moveId: "surf", method: { kind: "level-up", level: 44 } },
    { moveId: "recover", method: { kind: "level-up", level: 48 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 56 } },
  ],
};
