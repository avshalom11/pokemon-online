import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Starmie (#0121) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const STARMIE_LEARNSET: PokemonLearnset = {
  pokemonId: "starmie",
  generation: 1,
  entries: [
    { moveId: "confuse-ray", method: { kind: "level-up", level: 1 } },
    { moveId: "harden", method: { kind: "level-up", level: 1 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 1 } },
    { moveId: "light-screen", method: { kind: "level-up", level: 1 } },
    { moveId: "minimize", method: { kind: "level-up", level: 1 } },
    { moveId: "psybeam", method: { kind: "level-up", level: 1 } },
    { moveId: "psychic", method: { kind: "level-up", level: 1 } },
    { moveId: "recover", method: { kind: "level-up", level: 1 } },
    { moveId: "surf", method: { kind: "level-up", level: 1 } },
    { moveId: "swift", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
  ],
};
