import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Spearow (#0021) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const SPEAROW_LEARNSET: PokemonLearnset = {
  pokemonId: "spearow",
  generation: 1,
  entries: [
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "peck", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 4 } },
    { moveId: "fury-attack", method: { kind: "level-up", level: 11 } },
    { moveId: "mirror-move", method: { kind: "level-up", level: 18 } },
    { moveId: "agility", method: { kind: "level-up", level: 25 } },
    { moveId: "focus-energy", method: { kind: "level-up", level: 29 } },
    { moveId: "drill-peck", method: { kind: "level-up", level: 36 } },
  ],
};
