import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Magmar (#0126) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const MAGMAR_LEARNSET: PokemonLearnset = {
  pokemonId: "magmar",
  generation: 1,
  entries: [
    { moveId: "ember", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "smog", method: { kind: "level-up", level: 1 } },
    { moveId: "smokescreen", method: { kind: "level-up", level: 1 } },
    { moveId: "fire-spin", method: { kind: "level-up", level: 15 } },
    { moveId: "confuse-ray", method: { kind: "level-up", level: 20 } },
    { moveId: "fire-punch", method: { kind: "level-up", level: 28 } },
    { moveId: "low-kick", method: { kind: "level-up", level: 40 } },
    { moveId: "flamethrower", method: { kind: "level-up", level: 46 } },
    { moveId: "fire-blast", method: { kind: "level-up", level: 58 } },
    { moveId: "hyper-beam", method: { kind: "level-up", level: 64 } },
  ],
};
