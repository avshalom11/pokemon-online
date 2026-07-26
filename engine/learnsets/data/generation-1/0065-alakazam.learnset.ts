import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Alakazam (#0065) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const ALAKAZAM_LEARNSET: PokemonLearnset = {
  pokemonId: "alakazam",
  generation: 1,
  entries: [
    { moveId: "confusion", method: { kind: "level-up", level: 1 } },
    { moveId: "disable", method: { kind: "level-up", level: 1 } },
    { moveId: "kinesis", method: { kind: "level-up", level: 1 } },
    { moveId: "teleport", method: { kind: "level-up", level: 1 } },
    { moveId: "psybeam", method: { kind: "level-up", level: 5 } },
    { moveId: "reflect", method: { kind: "level-up", level: 10 } },
    { moveId: "recover", method: { kind: "level-up", level: 25 } },
    { moveId: "psychic", method: { kind: "level-up", level: 35 } },
  ],
};
