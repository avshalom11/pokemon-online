import * as z from "zod";

// Same style as features/onboarding/validation/select-starter.schema.ts.
// This is where the 1-6 slot range is actually enforced, since the DB
// column (PlayerPokemon.partySlot) has no CHECK constraint.
const partySlotIndex = z.number().int().min(1).max(6);

export const assignPartySlotSchema = z.object({
  playerPokemonId: z.string().min(1),
  slotIndex: partySlotIndex,
});

export const removePartySlotSchema = z.object({
  playerPokemonId: z.string().min(1),
});

export const swapPartySlotsSchema = z.object({
  slotIndexA: partySlotIndex,
  slotIndexB: partySlotIndex,
});
