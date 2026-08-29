import * as z from "zod";

// Structural validation only — ownership, availability, compatibility, and
// the actual itemId -> moveId resolution are teachTm's own job (features/
// tm-system/services/teach-tm.service.ts), since a zod schema can't do
// those lookups. Same "structural only" split
// features/evolution/validation/evolution.schema.ts already establishes.
export const teachTmDecisionSchema = z.object({
  playerPokemonId: z.string().min(1),
  itemId: z.string().min(1),
  // Only meaningful (and only required, by the service itself, never here)
  // when the target Pokémon already knows 4 moves — see teachTm's own
  // "forget-slot-required" rejection.
  forgetSlot: z.number().int().min(1).max(4).optional(),
});

export const tmUseCandidatesRequestSchema = z.object({
  itemId: z.string().min(1),
});
