import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Articuno (#0144) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const ARTICUNO_LEARNSET: PokemonLearnset = {
  pokemonId: "articuno",
  generation: 1,
  entries: [
    { moveId: "gust", method: { kind: "level-up", level: 1 } },
    { moveId: "mist", method: { kind: "level-up", level: 1 } },
    { moveId: "reflect", method: { kind: "level-up", level: 10 } },
    { moveId: "agility", method: { kind: "level-up", level: 20 } },
    { moveId: "ice-beam", method: { kind: "level-up", level: 45 } },
    { moveId: "haze", method: { kind: "level-up", level: 60 } },
    { moveId: "blizzard", method: { kind: "level-up", level: 65 } },
  ],
};
