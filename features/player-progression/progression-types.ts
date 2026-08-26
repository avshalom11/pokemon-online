// Player/account-level progression only — never reused for the future,
// separate Pokémon-level XP system (different curve, different growth
// rules; see this module's own README-style comment in progression-service.ts).

// A point-in-time snapshot derived from total accumulated XP alone — never
// stored as-is, always recomputed from PlayerProfile.experience so it can
// never drift out of sync with the stored total.
export interface PlayerProgress {
  level: number;
  totalXp: number;
  // Progress within the current level (0 at level start), NOT total lifetime
  // XP — this is what the Home XP bar displays.
  currentLevelXp: number;
  xpRequiredForNextLevel: number;
}

// PLAYER LEVEL-UP REWARDS — a combined Money/Gold total, produced by
// progression-calculations.ts's calculateLevelUpReward (summed across every
// level crossed in one XP grant) and by LevelUpResult below (the exact
// amount already granted for that grant).
export interface LevelUpReward {
  money: number;
  gold: number;
}

// Returned by addPlayerExperience so callers (battle feedback, future
// systems) never have to recompute progression independently.
export interface LevelUpResult {
  previousLevel: number;
  newLevel: number;
  xpGained: number;
  totalXp: number;
  leveledUp: boolean;
  levelsGained: number;
  currentLevelXp: number;
  xpRequiredForNextLevel: number;
  // PLAYER LEVEL-UP REWARDS — combined Money/Gold already granted (see
  // progression-service.ts's addPlayerExperience) for every level crossed by
  // this XP grant. Always 0/0 when leveledUp is false; never recomputed by a
  // caller — these are the exact amounts already applied to the player's
  // PlayerProfile row server-side.
  moneyReward: number;
  goldReward: number;
}
