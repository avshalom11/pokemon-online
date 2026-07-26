import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Dodrio (#0085) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const DODRIO_LEARNSET: PokemonLearnset = {
  pokemonId: "dodrio",
  generation: 1,
  entries: [
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "peck", method: { kind: "level-up", level: 1 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "rage", method: { kind: "level-up", level: 1 } },
    { moveId: "tri-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "fury-attack", method: { kind: "level-up", level: 12 } },
    { moveId: "agility", method: { kind: "level-up", level: 23 } },
    { moveId: "swords-dance", method: { kind: "level-up", level: 34 } },
    { moveId: "drill-peck", method: { kind: "level-up", level: 38 } },
    { moveId: "jump-kick", method: { kind: "level-up", level: 43 } },
    { moveId: "thrash", method: { kind: "level-up", level: 50 } },
  ],
};
