import * as z from "zod";

// Structural validation only — ownership, the pending decision's continued
// existence, and target-species validity are the services' job (see
// accept-evolution.service.ts / reject-evolution.service.ts), since a zod
// schema can't do those lookups.
export const evolutionDecisionSchema = z.object({
  playerPokemonId: z.string().min(1),
});
