import type { BattleKnownMoveSlot } from "@/features/battle/services/battle-view.service";
import type { BattleAttackSlot } from "@/shared/types/battle-ui";

// Pure, framework-free — no React, no DB (see battle-turn-rules.ts's own
// doc comment for why logic like this is kept out of BattleContent: so the
// actual branching/shape rules are testable independent of the component's
// wiring). Turns whatever subset of Known Move slots (1-4) a Pokémon
// currently has into exactly four UI attack slots, always in slot order,
// with any gap rendered as a disabled placeholder — "a Pokémon may know 1,
// 2, 3, or 4 moves; always render four slots; never reorder moves."
export const KNOWN_MOVE_SLOT_COUNT = 4;

// Phase 7 — Disable/Encore restriction, purely client-facing (server
// validation, features/battle/services/battle-action.service.ts, is the
// actual source of truth — this only keeps the UI from offering a move
// the server would reject anyway). disabledMoveId grays out one slot;
// encoreMoveId (when set) grays out every OTHER slot instead.
export interface AttackSlotRestriction {
  disabledMoveId?: string | null;
  encoreMoveId?: string | null;
}

export function buildAttackSlots(knownMoves: BattleKnownMoveSlot[], restriction?: AttackSlotRestriction): BattleAttackSlot[] {
  const bySlot = new Map(knownMoves.map((move) => [move.slot, move]));

  return Array.from({ length: KNOWN_MOVE_SLOT_COUNT }, (_, index) => {
    const slotNumber = index + 1;
    const move = bySlot.get(slotNumber);

    if (!move) {
      return { id: `empty-slot-${slotNumber}`, name: "—", disabled: true };
    }

    const restricted =
      move.moveId === restriction?.disabledMoveId || (Boolean(restriction?.encoreMoveId) && move.moveId !== restriction?.encoreMoveId);

    return {
      id: move.moveId,
      name: move.name,
      type: move.type,
      category: move.category,
      power: move.power,
      accuracy: move.accuracy,
      // Omitted entirely (never an explicit `disabled: undefined` key)
      // when not restricted — keeps this identical to the pre-Phase-7
      // shape for every existing caller/test that never passes a
      // restriction at all.
      ...(restricted ? { disabled: true } : {}),
    };
  });
}
