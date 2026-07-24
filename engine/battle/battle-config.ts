// TEMPORARY combat system — deliberately simpler than the real move-based
// engine (battle-engine.ts + damage-calculation.ts + move-data.ts): fixed
// damage, no PP/accuracy/crits/type effectiveness. Every Pokémon shares one
// attack until the real moves system is wired into gameplay. When that
// happens, this whole file goes away and BattleContent switches to
// executeBattleTurn() instead — nothing outside this file should assume
// TEMPORARY_ATTACK_DAMAGE survives that change.
export const TEMPORARY_ATTACK_DAMAGE = 8;

// TEMPORARY dev/testing override — see battleDevelopmentConfig below for
// the same pattern applied to Poké Balls. Scoped to one exact
// PlayerPokemon.id (avshalom's owned Charmander), never a species/level/
// account-wide rule, so it can never affect any other Pokémon. Set to
// `null` to remove entirely once no longer needed for testing; nothing
// else needs to change.
const ONE_HIT_KO_PLAYER_POKEMON_ID: string | null = "cmrwlaet00007bwo7qmbpnolk";

// Single place both HP updates (player-hits-wild, wild-hits-player) go
// through, so "clamp at 0" and the damage constant are never duplicated
// inline in UI components. `attackerPlayerPokemonId` is only ever passed
// for the player-hits-wild direction (see BattleContent's handleAttack) —
// the wild-hits-player direction (battle-turn-rules.ts's
// resolveWildCounterAttack) never passes it, so ONE_HIT_KO_PLAYER_POKEMON_ID
// can only ever reduce a *wild's* HP, never make this Pokémon untouchable
// itself.
export function applyFixedAttack(currentHp: number, attackerPlayerPokemonId?: string): number {
  if (attackerPlayerPokemonId && attackerPlayerPokemonId === ONE_HIT_KO_PLAYER_POKEMON_ID) {
    return 0;
  }

  return Math.max(0, currentHp - TEMPORARY_ATTACK_DAMAGE);
}

// Development-only Poké Ball behavior. Every capture-availability check
// (UI and server) must read this flag rather than hardcoding `true` —
// flipping it to `false` (once a real Bag/inventory system exists) is
// meant to be the only change needed to require real ball counts again.
export const battleDevelopmentConfig = {
  unlimitedPokeballs: true,
} as const;
