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

export function buildAttackSlots(knownMoves: BattleKnownMoveSlot[]): BattleAttackSlot[] {
  const bySlot = new Map(knownMoves.map((move) => [move.slot, move]));

  return Array.from({ length: KNOWN_MOVE_SLOT_COUNT }, (_, index) => {
    const slotNumber = index + 1;
    const move = bySlot.get(slotNumber);

    if (!move) {
      return { id: `empty-slot-${slotNumber}`, name: "—", disabled: true };
    }

    return {
      id: move.moveId,
      name: move.name,
      type: move.type,
      category: move.category,
      power: move.power,
      accuracy: move.accuracy,
    };
  });
}
