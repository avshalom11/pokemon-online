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

// Player XP reward for defeating a wild Pokémon in a Field Battle:
// BASE + wildLevel * PER_LEVEL, rounded (see calculateVictoryXpReward). The
// ONE place this reward is tuned — battle-session.service.ts never adds a
// second multiplier of its own. Halved from the original 10/5 (which
// produced ~80-120 for the game's typical wild levels) to ~40-60, per this
// project's own rebalance: Field Battle Player XP specifically was judged
// too generous relative to the rest of the account-XP economy. Deliberately
// NOT touched by this change: CAPTURE_XP_BASE/CAPTURE_XP_PER_LEVEL below
// (a completely separate reward for successfully CATCHING a wild Pokémon,
// not defeating one), Pokémon XP (features/pokemon-progression/'s own,
// unrelated config), and Gym/League player XP (features/gyms/features/
// leagues's own calculateGymRewardXp/calculateLeagueRewardXp formulas —
// neither reads these constants at all).
export const VICTORY_XP_BASE = 5;
export const VICTORY_XP_PER_LEVEL = 2.5;

// Player XP reward for successfully capturing a wild Pokémon.
export const CAPTURE_XP_BASE = 15;
export const CAPTURE_XP_PER_LEVEL = 5;

// PLAYER LEVEL-UP REWARDS — Money/Gold granted once for each account level
// reached (level 1 is the player's starting level, never rewarded — the
// lowest tier below starts at level 2). Read via
// progression-calculations.ts's calculateLevelUpReward, the one place these
// tiers are looked up; never hardcode a bracket elsewhere. `maxLevel` is an
// inclusive upper bound — a level's own reward is the first tier whose
// maxLevel is >= that level, so the final tier's Infinity catches every
// level from 55 up.
export interface LevelUpRewardTier {
  maxLevel: number;
  money: number;
  gold: number;
}

export const LEVEL_UP_REWARD_TIERS: readonly LevelUpRewardTier[] = [
  { maxLevel: 10, money: 1500, gold: 20 },
  { maxLevel: 20, money: 1750, gold: 22 },
  { maxLevel: 30, money: 2000, gold: 24 },
  { maxLevel: 40, money: 2500, gold: 27 },
  { maxLevel: 50, money: 3000, gold: 30 },
  { maxLevel: 54, money: 3250, gold: 33 },
  { maxLevel: Infinity, money: 3500, gold: 35 },
];
