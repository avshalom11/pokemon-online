import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Electabuzz (#0125) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const ELECTABUZZ_LEARNSET: PokemonLearnset = {
  pokemonId: "electabuzz",
  generation: 1,
  entries: [
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
    { moveId: "swift", method: { kind: "level-up", level: 12 } },
    { moveId: "thunder-wave", method: { kind: "level-up", level: 20 } },
    { moveId: "screech", method: { kind: "level-up", level: 24 } },
    { moveId: "thunder-punch", method: { kind: "level-up", level: 28 } },
    { moveId: "low-kick", method: { kind: "level-up", level: 40 } },
    { moveId: "thunderbolt", method: { kind: "level-up", level: 46 } },
    { moveId: "light-screen", method: { kind: "level-up", level: 52 } },
    { moveId: "thunder", method: { kind: "level-up", level: 58 } },
  ],
};
