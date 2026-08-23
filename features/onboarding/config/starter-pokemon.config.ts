// NEW PLAYER STARTER — the one place the starter Pokémon's initial level is
// tuned. Read exclusively by select-starter.service.ts's
// selectStarterPokemon, which derives the correct persisted XP for this
// level via pokemon-progression-calculations.ts's own
// getTotalXpRequiredForPokemonLevel (never a duplicated XP formula) and
// passes the same level straight into createOwnedPokemon, whose own
// getStartingKnownMoves(speciesId, level) call resolves the correct
// level-appropriate moveset automatically — this constant is the only
// thing that needs to change to retune the starter's starting level.
//
// Applies ONLY to a brand-new player's very first starter Pokémon
// (selectStarterPokemon's own onboardingCompleted guard already ensures
// this can only ever run once per account) — never wild/captured/hatched/
// Daycare Pokémon, and never retroactively changes an existing player's
// already-created starter.
export const STARTER_POKEMON_LEVEL = 10;
