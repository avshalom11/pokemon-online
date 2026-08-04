import type { LevelUpMoveLearningPlan } from "@/engine/move-learning";

// Owned-Pokémon progression only — never reused for the separate
// player/account-level XP system (features/player-progression), which has
// its own curve, its own reward formula, and its own result types.

// A point-in-time snapshot derived from a Pokémon's total accumulated XP
// alone — never stored as-is, always recomputed from PlayerPokemon.experience
// so it can never drift out of sync with the stored total. Mirrors
// PlayerProgress (features/player-progression/progression-types.ts) with
// the addition of remainingXp/progressPercent/isMaxLevel, which the battle
// UI's per-Pokémon progress display needs directly.
export interface PokemonProgress {
  level: number;
  totalXp: number;
  // Progress within the current level (0 at level start), NOT total
  // lifetime XP.
  currentLevelXp: number;
  // 0 once isMaxLevel is true — there is no "next level" to require XP for.
  xpRequiredForNextLevel: number;
  // xpRequiredForNextLevel - currentLevelXp, clamped to 0. Also 0 at max level.
  remainingXp: number;
  // 0-100, rounded. 100 once isMaxLevel is true, regardless of totalXp.
  progressPercent: number;
  isMaxLevel: boolean;
}

// Every owned Pokémon that has actually entered the *current* wild
// encounter — persisted on FieldBattleSession.participants (see
// battle-session.service.ts's recordBattleParticipant/
// markParticipantFainted/resetBattleParticipants) so participation survives
// a refresh/restore exactly like wildCurrentHp/activePlayerPokemonId
// already do. `order` is the 0-based index of first participation, kept for
// deterministic ordering even though the current distribution rule
// (distributeBattlePokemonXp) doesn't consume it — a future distribution
// rule that weights earlier participants differently can use it without a
// schema change.
export interface BattleParticipantRecord {
  playerPokemonId: string;
  fainted: boolean;
  order: number;
}

// "finisher" delivered the lethal hit; "participant" survived and
// eligible but didn't land the final blow. A fainted Pokémon is never
// rewarded at all (see grantBattlePokemonXp), so there is no "fainted" role
// here — it simply doesn't appear in the reward result list.
export type PokemonXpRewardRole = "finisher" | "participant";

// One entry of distributeBattlePokemonXp's pure output — the reward-pool
// split, before any DB write. xpShare is the *effective* fraction of
// BaseBattleXp this participant actually received (xpAmount / baseXp), not
// a fixed role constant: with 3+ participants each non-finisher's effective
// share is BASE_XP_OTHER_PARTICIPANTS_SHARE divided across however many of
// them there are, so it varies with participant count.
export interface PokemonXpShare {
  playerPokemonId: string;
  role: PokemonXpRewardRole;
  xpAmount: number;
  xpShare: number;
}

// The authoritative, server-computed result for one rewarded Pokémon after
// a battle victory — returned by applyPokemonXpGrant (single Pokémon) and
// collected into an array by grantBattlePokemonXp (the whole battle's
// reward). Everything here is already-computed fact, never something a
// client can supply or influence; the battle UI only ever displays these
// values, never recomputes them (progression math stays exclusively in
// pokemon-progression-calculations.ts).
export interface PokemonLevelUpResult {
  playerPokemonId: string;
  speciesId: string;
  speciesName: string;
  rewardRole: PokemonXpRewardRole;
  xpShare: number;
  xpGained: number;
  previousTotalXp: number;
  newTotalXp: number;
  previousLevel: number;
  newLevel: number;
  levelsGained: number;
  currentLevelXp: number;
  xpRequiredForNextLevel: number;
  remainingXp: number;
  progressPercent: number;
  isMaxLevel: boolean;
  // Recalculated from the new level via engine/battle/pokemon-stat-calculations.ts's
  // calculatePokemonHpStat — see applyPokemonXpGrant. newCurrentHp already
  // has the level-up current-HP rule (applyLevelUpToCurrentHp) applied, so
  // callers never need to re-derive it: it's exactly what PlayerPokemon.currentHp
  // was written to in the same transaction as the level/experience update.
  newMaxHp: number;
  newCurrentHp: number;

  // What leveling from previousLevel to newLevel did to this Pokémon's
  // moves (Phase 4D) — computed and persisted (Known Move/Pending Move
  // Learning rows) in the same transaction as the level/XP/HP update
  // above, via features/move-learning's applyLevelUpMoveLearning. Empty
  // (no detected/learned/pending moves) whenever previousLevel ===
  // newLevel, i.e. an XP grant that didn't cross a level boundary. IDs
  // only, never preformatted display text — a future UI derives messages
  // like "X learned Y" from this itself.
  moveLearning: LevelUpMoveLearningPlan;

  // Non-null exactly when this exact XP grant just created a new
  // single-target pending evolution decision for this Pokémon (features/
  // evolution/services/evolution-progress.service.ts's
  // tryCreatePendingEvolution, called from applyPokemonXpGrant right after
  // moveLearning above — see that function's own doc comment for the
  // deterministic ordering rule). Never set merely because a pending
  // decision already existed from an earlier grant — only the grant that
  // actually created it reports it, so the battle UI shows the evolution
  // prompt exactly once, the moment it becomes true, never repeatedly on
  // every subsequent reward.
  pendingEvolutionSpeciesId: string | null;

  // True exactly when this exact XP grant just created a new pending
  // BRANCH evolution CHOICE for this Pokémon (Eevee's Espeon/Umbreon fork
  // today — see data/pokemon/pokemon-evolutions.ts's BRANCH_EVOLUTIONS).
  // Mutually exclusive with pendingEvolutionSpeciesId being non-null for
  // the same grant — a species resolves to either a single target or a
  // branch choice, never both (tryCreatePendingEvolution's own doc
  // comment). The battle UI shows the branch-choice prompt
  // (EvolutionBranchChoiceDialog) instead of the normal confirm dialog
  // whenever this is true.
  pendingEvolutionBranch: boolean;
}

// Where a Pokémon-XP grant originated — only "wildBattleVictory" exists
// yet, but every grant path threads a reason through
// (applyPokemonXpGrant/grantBattlePokemonXp) so trainer battles, raids,
// quests, events, and items can each add their own reason later without
// changing the grant function's signature again.
export type PokemonXpSource = "wildBattleVictory";
