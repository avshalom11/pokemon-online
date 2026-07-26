import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Ekans (#0023) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const EKANS_LEARNSET: PokemonLearnset = {
  pokemonId: "ekans",
  generation: 1,
  entries: [
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "wrap", method: { kind: "level-up", level: 1 } },
    { moveId: "poison-sting", method: { kind: "level-up", level: 4 } },
    { moveId: "bite", method: { kind: "level-up", level: 9 } },
    { moveId: "glare", method: { kind: "level-up", level: 12 } },
    { moveId: "screech", method: { kind: "level-up", level: 17 } },
    { moveId: "acid", method: { kind: "level-up", level: 20 } },
    { moveId: "haze", method: { kind: "level-up", level: 41 } },
  ],
};
