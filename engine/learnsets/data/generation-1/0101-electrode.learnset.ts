import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Electrode (#0101) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const ELECTRODE_LEARNSET: PokemonLearnset = {
  pokemonId: "electrode",
  generation: 1,
  entries: [
    { moveId: "sonic-boom", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
    { moveId: "screech", method: { kind: "level-up", level: 13 } },
    { moveId: "swift", method: { kind: "level-up", level: 20 } },
    { moveId: "self-destruct", method: { kind: "level-up", level: 26 } },
    { moveId: "light-screen", method: { kind: "level-up", level: 29 } },
    { moveId: "explosion", method: { kind: "level-up", level: 47 } },
  ],
};
