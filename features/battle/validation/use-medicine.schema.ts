import * as z from "zod";

// Structural validation only — item ownership, target ownership, and the
// fainted/non-fainted targeting rules are the service's job
// (use-medicine.service.ts), since a zod schema can't do those lookups.
export const useMedicineItemSchema = z.object({
  itemId: z.string().min(1),
  playerPokemonId: z.string().min(1),
});
