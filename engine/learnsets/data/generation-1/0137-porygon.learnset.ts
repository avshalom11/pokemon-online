import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Porygon (#0137) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const PORYGON_LEARNSET: PokemonLearnset = {
  pokemonId: "porygon",
  generation: 1,
  entries: [
    { moveId: "conversion", method: { kind: "level-up", level: 1 } },
    { moveId: "sharpen", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder-shock", method: { kind: "level-up", level: 15 } },
    { moveId: "psybeam", method: { kind: "level-up", level: 20 } },
    { moveId: "agility", method: { kind: "level-up", level: 30 } },
    { moveId: "recover", method: { kind: "level-up", level: 35 } },
    { moveId: "tri-attack", method: { kind: "level-up", level: 45 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 50 } },
  ],
};
