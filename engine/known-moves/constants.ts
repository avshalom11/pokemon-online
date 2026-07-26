// The current game rule: an owned Pokémon knows at most four moves at
// once, in ordered slots 1..MAX_KNOWN_MOVES. Every schema, validator, and
// operation in this module reads the limit from here — never a literal
// `4` scattered around — so a future ruleset change is one line.
export const MAX_KNOWN_MOVES = 4;
export const MIN_KNOWN_MOVE_SLOT = 1;
export const MAX_KNOWN_MOVE_SLOT = MAX_KNOWN_MOVES;
