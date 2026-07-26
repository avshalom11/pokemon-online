import * as z from "zod";

// Same style as features/party/validation/party.schema.ts. Slot range
// mirrors MAX_KNOWN_MOVES (engine/known-moves) — 1-4, not the 1-6 party
// slot range.
const knownMoveSlot = z.number().int().min(1).max(4);

export const resolvePendingMoveLearnSchema = z.object({
  pendingId: z.string().min(1),
  slot: knownMoveSlot,
});

export const declinePendingMoveSchema = z.object({
  pendingId: z.string().min(1),
});

export const pendingMoveLearningViewSchema = z.object({
  playerPokemonId: z.string().min(1),
});
