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

export interface BattleAttackSlot {
  id: string;
  name: string;
}
