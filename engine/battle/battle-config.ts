// TEMPORARY combat system — deliberately simpler than the real move-based
// engine (battle-engine.ts + damage-calculation.ts + move-data.ts): fixed
// damage, no PP/accuracy/crits/type effectiveness. Every Pokémon shares one
// attack until the real moves system is wired into gameplay. When that
// happens, this whole file goes away and BattleContent switches to
// executeBattleTurn() instead — nothing outside this file should assume
// TEMPORARY_ATTACK_DAMAGE survives that change.
export const TEMPORARY_ATTACK_DAMAGE = 8;

// Single place both HP updates (player-hits-wild, wild-hits-player) go
// through, so "clamp at 0" and the damage constant are never duplicated
// inline in UI components.
export function applyFixedAttack(currentHp: number): number {
  return Math.max(0, currentHp - TEMPORARY_ATTACK_DAMAGE);
}

// Development-only Poké Ball behavior. Every capture-availability check
// (UI and server) must read this flag rather than hardcoding `true` —
// flipping it to `false` (once a real Bag/inventory system exists) is
// meant to be the only change needed to require real ball counts again.
export const battleDevelopmentConfig = {
  unlimitedPokeballs: true,
} as const;
