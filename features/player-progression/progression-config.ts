// Player/account-level progression tuning — deliberately separate from any
// future Pokémon-level XP curve (which will have its own config/formulas).
// Tune here only; every consumer reads through progression-calculations.ts
// rather than hardcoding these numbers.

// XP required to advance from level N to level N+1 is `N * XP_PER_LEVEL`.
// Deliberately steep (1000, not 100): the progression curve is a continuously
// increasing triangular sum (see getTotalXpRequiredForLevel), so raising this
// one constant is what makes each successive level cost noticeably more than
// the last while keeping level 1->2 (1,000 XP) reachable for new players.
export const XP_PER_LEVEL = 1000;

// Player XP reward for defeating a wild Pokémon: BASE + wildLevel * PER_LEVEL.
export const VICTORY_XP_BASE = 10;
export const VICTORY_XP_PER_LEVEL = 5;

// Player XP reward for successfully capturing a wild Pokémon.
export const CAPTURE_XP_BASE = 15;
export const CAPTURE_XP_PER_LEVEL = 5;
