import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Magneton (#0082) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const MAGNETON_LEARNSET: PokemonLearnset = {
  pokemonId: "magneton",
  generation: 1,
  entries: [
    { moveId: "supersonic", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder-wave", method: { kind: "level-up", level: 1 } },
    { moveId: "tri-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "sonic-boom", method: { kind: "level-up", level: 17 } },
    { moveId: "screech", method: { kind: "level-up", level: 24 } },
    { moveId: "light-screen", method: { kind: "level-up", level: 52 } },
  ],
};
