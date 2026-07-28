import type { VolatileState } from "./volatile-condition.types";

// Phase 7 — the single source of truth for "which of this side's Known
// Moves may currently be selected/executed," given Disable and Encore.
// Used identically by: server-side validation of the player's submitted
// moveId (battle-action.service.ts), enemy random move selection (which
// must exclude a disabled move / be restricted to an encored one, same as
// the player), and the UI's attack panel (which move buttons render
// disabled) — one rule, never duplicated three times. Pure: no Prisma, no
// Hebrew, no randomness.
//
// If Encore's own forced move happens to also be disabled (the
// Disable+Encore conflict resolve-volatile-effects.ts documents), this
// naturally falls through to the plain disabled-filtered list instead of
// returning an impossible empty-or-illegal restriction — the smallest
// consistent behavior, not a new rule of its own.
//
// If every known move ends up excluded (only possible if Disable's own
// target happens to be the side's only known move), the safest simple
// fallback is used: fall back to every known move rather than inventing
// Struggle or leaving the actor with zero usable moves. This can only
// happen when a Pokémon knows exactly one move and it becomes disabled —
// there is no unreachable "no valid move" state in this project otherwise
// (party members generally know 2+ moves once past the very first level).
export function getUsableMoveIds(knownMoveIds: readonly string[], volatile: VolatileState): string[] {
  const nonDisabled = knownMoveIds.filter((id) => id !== volatile.disable?.moveId);

  if (volatile.encore && nonDisabled.includes(volatile.encore.moveId)) {
    return [volatile.encore.moveId];
  }

  return nonDisabled.length > 0 ? nonDisabled : [...knownMoveIds];
}
