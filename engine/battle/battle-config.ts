// TEMPORARY combat system — deliberately simpler than the real move-based
// engine (battle-engine.ts + damage-calculation.ts + move-data.ts): fixed
// damage, no PP/accuracy/crits/type effectiveness.
//
// Phase 5B.2: the player's own attack no longer uses this — it now goes
// through the real Phase 5B.1 Damage Engine (see
// features/battle/services/battle-action.service.ts's resolveAttackDamage
// call).
//
// Phase 5H: the Battle Action Service's own wild-hits-player branch no
// longer uses this either — the wild now selects one of its own Known
// Moves and runs it through the same real Damage Engine pipeline (see
// executeBattleAction and features/battle/ai/select-enemy-move.ts). This
// function is still alive for exactly one remaining caller:
// battle-turn-rules.ts's resolveWildCounterAttack, the switch-in/
// failed-capture counter-hit, which real enemy move selection doesn't
// cover yet. Every remaining caller still only ever invokes this in the
// wild-hits-player direction — see ONE_HIT_KO_PLAYER_POKEMON_ID's own doc
// comment below for what that means for the one-hit-KO dev override.
export const TEMPORARY_ATTACK_DAMAGE = 8;

// TEMPORARY dev/testing override — see battleDevelopmentConfig below for
// the same pattern applied to Poké Balls. Scoped to one exact
// PlayerPokemon.id (avshalom's owned Charmander), never a species/level/
// account-wide rule, so it can never affect any other Pokémon.
//
// Phase 5B.2: since every remaining caller of applyFixedAttack only ever
// attacks in the wild-hits-player direction (never passing
// attackerPlayerPokemonId — see this function's own doc comment above),
// this override is now permanently dormant rather than removed outright;
// nothing here needs to change for that to be safe. Set to `null` (or
// delete this override and the `attackerPlayerPokemonId` parameter
// entirely) whenever it's no longer wanted for testing.
const ONE_HIT_KO_PLAYER_POKEMON_ID: string | null = "cmrwlaet00007bwo7qmbpnolk";

// Single place both HP updates (player-hits-wild, wild-hits-player) go
// through, so "clamp at 0" and the damage constant are never duplicated
// inline in UI components. `attackerPlayerPokemonId` is only ever passed
// for the player-hits-wild direction — see this file's Phase 5B.2 doc
// comments above for why no live caller passes it anymore.
export function applyFixedAttack(currentHp: number, attackerPlayerPokemonId?: string): number {
  if (attackerPlayerPokemonId && attackerPlayerPokemonId === ONE_HIT_KO_PLAYER_POKEMON_ID) {
    return 0;
  }

  return Math.max(0, currentHp - TEMPORARY_ATTACK_DAMAGE);
}

// Development-only Poké Ball behavior. A real Bag/inventory system now
// gates capture (features/battle/services/capture.service.ts consumes a
// real PlayerInventoryItem ball on every attempt) — flipped to `false` to
// match; kept as a named export rather than deleted in case a future dev/
// testing override needs a single flag to reintroduce free captures.
export const battleDevelopmentConfig = {
  unlimitedPokeballs: false,
} as const;
