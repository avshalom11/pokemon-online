import type { BattleActor } from "@/features/battle/events/battle-event.types";

// Phase 7 — battle-local Volatile Conditions. Exists only for the CURRENT
// wild encounter, exactly like stat stages (features/battle/stats/
// stat-stages.ts): never touches PlayerPokemon, reset on switch-out and on
// a new encounter, persisted as one JSON blob per side on
// FieldBattleSession (wildVolatileState / playerVolatileState — see
// battle-session.service.ts). One VolatileState always describes whichever
// Pokémon is CURRENTLY active on that side; it is never keyed by Pokémon id.
//
// lastUsedMoveId is not itself a "condition" but lives here because Disable
// and Encore both need "the last move this exact battler successfully
// attempted" — tracked per side, reset on switch exactly like everything
// else here (a freshly-switched-in Pokémon has no prior move to disable or
// repeat).
export interface VolatileState {
  lastUsedMoveId?: string;
  confusion?: { turnsRemaining: number };
  // True only for the remainder of THIS turn — see
  // resolve-pre-action-volatile.ts. Always cleared by the end of the turn
  // it was applied, whether or not it ever prevented an action.
  flinch?: boolean;
  // active is true only for the current turn (cleared at end-of-turn,
  // resolve-end-of-turn-volatile.ts); consecutiveUses survives across
  // turns until a non-Protect move is used or the Pokémon switches — see
  // resolve-volatile-effects.ts's resolveProtectAttempt.
  protect?: { active: boolean; consecutiveUses: number };
  disable?: { moveId: string; turnsRemaining: number };
  encore?: { moveId: string; turnsRemaining: number };
  // source: which side benefits from the drain (whoever planted the seed),
  // not necessarily who currently occupies that side's active slot.
  leechSeed?: { source: BattleActor };
  trapping?: { source: BattleActor; turnsRemaining: number };
}

export const EMPTY_VOLATILE_STATE: VolatileState = {};

// Phase 7 — switching (voluntary or forced) always resets a side's
// volatile state entirely, exactly like stat stages already do
// (syncActivePokemon). A trivial function rather than just inlining `{}`
// at every call site so the *rule* ("switching always wipes volatile
// state") has one obvious, named, testable place to live.
export function resetVolatileOnSwitch(): VolatileState {
  return {};
}

export type VolatileConditionKind = "confusion" | "flinch" | "protect" | "disable" | "encore" | "leech-seed" | "trapping";
