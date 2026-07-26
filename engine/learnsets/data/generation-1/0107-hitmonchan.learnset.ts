import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Hitmonchan (#0107) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const HITMONCHAN_LEARNSET: PokemonLearnset = {
  pokemonId: "hitmonchan",
  generation: 1,
  entries: [
    { moveId: "comet-punch", method: { kind: "level-up", level: 1 } },
    { moveId: "focus-energy", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "fire-punch", method: { kind: "level-up", level: 24 } },
    { moveId: "ice-punch", method: { kind: "level-up", level: 24 } },
    { moveId: "thunder-punch", method: { kind: "level-up", level: 24 } },
    { moveId: "agility", method: { kind: "level-up", level: 28 } },
    { moveId: "mega-punch", method: { kind: "level-up", level: 32 } },
    { moveId: "counter", method: { kind: "level-up", level: 40 } },
  ],
};
