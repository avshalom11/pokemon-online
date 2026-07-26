import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Mr. Mime (#0122) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const MR_MIME_LEARNSET: PokemonLearnset = {
  pokemonId: "mr-mime",
  generation: 1,
  entries: [
    { moveId: "barrier", method: { kind: "level-up", level: 1 } },
    { moveId: "pound", method: { kind: "level-up", level: 1 } },
    { moveId: "meditate", method: { kind: "level-up", level: 8 } },
    { moveId: "double-slap", method: { kind: "level-up", level: 11 } },
    { moveId: "confusion", method: { kind: "level-up", level: 12 } },
    { moveId: "psywave", method: { kind: "level-up", level: 15 } },
    { moveId: "psybeam", method: { kind: "level-up", level: 28 } },
    { moveId: "substitute", method: { kind: "level-up", level: 29 } },
    { moveId: "mimic", method: { kind: "level-up", level: 32 } },
    { moveId: "light-screen", method: { kind: "level-up", level: 36 } },
    { moveId: "reflect", method: { kind: "level-up", level: 36 } },
    { moveId: "psychic", method: { kind: "level-up", level: 48 } },
  ],
};
