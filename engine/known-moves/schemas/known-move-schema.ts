import { z } from "zod";

import { moveIdSchema } from "../../moves/index.ts";
import { MAX_KNOWN_MOVES, MIN_KNOWN_MOVE_SLOT, MAX_KNOWN_MOVE_SLOT } from "../constants.ts";

// A move slot on one owned Pokémon — always 1..MAX_KNOWN_MOVES, never 0
// (mirrors the move/learnset engines' "never level/slot 0" convention).
export const knownMoveSlotSchema = z.int().min(MIN_KNOWN_MOVE_SLOT).max(MAX_KNOWN_MOVE_SLOT);

// One move an owned Pokémon currently knows. Only the reference (moveId)
// and its slot — no name/type/power/PP/etc. Those live exclusively in the
// static move registry (engine/moves) and are resolved by id when needed,
// never duplicated onto an owned Pokémon's record.
export const knownMoveSchema = z.object({
  moveId: moveIdSchema,
  slot: knownMoveSlotSchema,
});

// The full set of moves one owned Pokémon currently knows. Order in the
// array carries no meaning by itself — `slot` is the single source of
// truth for position — but a "compact" set (what every owned Pokémon must
// have at all times) additionally requires slots to be exactly 1..N with
// no gaps, e.g. [1,2,3,4] or [1,2] are valid, [1,3] is not. This lets a
// removal always compact later moves forward rather than leaving a hole.
export const knownMoveSetSchema = z
  .array(knownMoveSchema)
  .max(MAX_KNOWN_MOVES)
  .check((ctx) => {
    const moves = ctx.value;

    const moveIdCounts = new Map<string, number>();
    const slotCounts = new Map<number, number>();
    for (const move of moves) {
      moveIdCounts.set(move.moveId, (moveIdCounts.get(move.moveId) ?? 0) + 1);
      slotCounts.set(move.slot, (slotCounts.get(move.slot) ?? 0) + 1);
    }

    for (const [moveId, count] of moveIdCounts) {
      if (count > 1) {
        ctx.issues.push({
          code: "custom",
          message: `move "${moveId}" appears more than once in the known-move set`,
          path: [],
          input: moves,
        });
      }
    }

    for (const [slot, count] of slotCounts) {
      if (count > 1) {
        ctx.issues.push({
          code: "custom",
          message: `slot ${slot} is assigned to more than one move`,
          path: [],
          input: moves,
        });
      }
    }

    const sortedSlots = [...slotCounts.keys()].sort((a, b) => a - b);
    const isContiguousFromOne = sortedSlots.every((slot, index) => slot === index + 1);
    if (!isContiguousFromOne) {
      ctx.issues.push({
        code: "custom",
        message: `known-move slots must be contiguous starting at 1 (got: ${sortedSlots.join(", ") || "none"})`,
        path: [],
        input: moves,
      });
    }
  });

export type KnownMoveSlot = z.infer<typeof knownMoveSlotSchema>;
export type KnownMove = z.infer<typeof knownMoveSchema>;
export type KnownMoveSet = z.infer<typeof knownMoveSetSchema>;
