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
  // Optional: no Pokémon-leveling XP curve exists yet (only the separate
  // trainer-level one, engine/player/trainer-progress.ts) — omit both
  // rather than fabricate values; BattleScene only shows the EXP bar when
  // they're present.
  currentExperience?: number;
  maxExperience?: number;
}

export interface BattleMenuAction {
  id: string;
  label: string;
}

export interface BattleAttackSlot {
  id: string;
  name: string;
}
