import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Abra (#0063) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const ABRA_LEARNSET: PokemonLearnset = {
  pokemonId: "abra",
  generation: 1,
  entries: [
    { moveId: "teleport", method: { kind: "level-up", level: 1 } },
  ],
};
