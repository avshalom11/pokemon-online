import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Dragonite (#0149) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const DRAGONITE_LEARNSET: PokemonLearnset = {
  pokemonId: "dragonite",
  generation: 1,
  entries: [
    { moveId: "fire-punch", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder-punch", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder-wave", method: { kind: "level-up", level: 1 } },
    { moveId: "wing-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "wrap", method: { kind: "level-up", level: 1 } },
    { moveId: "dragon-rage", method: { kind: "level-up", level: 15 } },
    { moveId: "agility", method: { kind: "level-up", level: 20 } },
    { moveId: "slam", method: { kind: "level-up", level: 25 } },
    { moveId: "hyper-beam", method: { kind: "level-up", level: 80 } },
  ],
};
