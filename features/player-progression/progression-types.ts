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
}
