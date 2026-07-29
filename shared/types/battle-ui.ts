import type { PokemonRarity } from "./pokemon";

export interface BattleParticipantDisplay {
  name: string;
  level: number;
  currentHealth: number;
  maxHealth: number;
  // Optional so existing/future placeholder-only callers keep working
  // unchanged (PokemonSprite falls back to its own placeholder creature
  // when omitted). fallbackSpriteUrl is only meaningful for the player
  // side today (front sprite as a stand-in for a missing back sprite —
  // see components/battle/PokemonSprite.tsx), but kept on the shared
  // shape rather than split per-role to avoid two near-duplicate types.
  spriteUrl?: string;
  fallbackSpriteUrl?: string;
  // Phase 6F — the participant's current major status condition ("burn" |
  // "poison" | "paralysis" | "sleep" | "freeze"), or null/undefined when
  // healthy. BattleHUD renders this as a small BRN/PSN/PAR/SLP/FRZ badge.
  status?: string | null;
  // Phase 7 — short Volatile Condition badge codes (e.g. "CNF", "PRT",
  // "SEED", "TRAP") currently active on this participant, already resolved
  // by the caller (BattleContent) from the server's own
  // BattleVolatileSummary — never computed inside BattleHUD itself.
  // Omitted/empty renders none.
  volatileBadges?: string[];
  // Wild (enemy) participants only, sourced directly from the encounter's
  // PokemonSpecies.rarity — never set for the player, whose own species
  // rarity has no bearing on this feature. Optional so it silently renders
  // no label when absent, rather than requiring every caller to supply one.
  rarity?: PokemonRarity;
}

export interface PlayerBattleParticipantDisplay extends BattleParticipantDisplay {
  // Total lifetime Pokémon XP — PokemonXpBar (components/battle/
  // PokemonXpBar.tsx) derives current-level XP, the next-level requirement,
  // and the max-level state from this single number via the centralized
  // pokemon-progression calculations. Optional so a caller with no
  // Pokémon-progression data yet can still render the rest of the HUD;
  // BattleScene only shows the XP bar when it's present.
  experience?: number;
}

export interface BattleMenuAction {
  id: string;
  label: string;
}

// Phase 5A: id is the actual Known Move's moveId for a real slot — never a
// synthetic label like the old single "attack" placeholder — so selecting
// it can be passed straight through to the Battle Action Pipeline
// unmodified. type/category/power/accuracy are the same fields the Move
// Registry already exposes (engine/moves), read-only display data, never
// duplicated/reformatted here beyond what BattleAttackPanel needs to print
// them. Absent (undefined) exactly when `disabled` is true — an empty
// Known Move slot has no move to describe.
export interface BattleAttackSlot {
  id: string;
  name: string;
  type?: string;
  category?: string;
  power?: number | null;
  accuracy?: number | null;
  disabled?: boolean;
}
