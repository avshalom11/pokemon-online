import * as z from "zod";

// Structural validation only — ownership, the pending decision's continued
// existence, and target-species validity are the services' job (see
// accept-evolution.service.ts / reject-evolution.service.ts), since a zod
// schema can't do those lookups.
export const evolutionDecisionSchema = z.object({
  playerPokemonId: z.string().min(1),
});

// Same "structural only" split as evolutionDecisionSchema above — whether
// stoneItemId is actually one of the canonical Stone item ids, and whether
// the target species/stone pairing is valid, are accept-stone-evolution.
// service.ts's job (data/pokemon/pokemon-evolutions.ts's isEvolutionStoneItemId
// and getStoneEvolutionByItem).
export const stoneEvolutionDecisionSchema = z.object({
  playerPokemonId: z.string().min(1),
  stoneItemId: z.string().min(1),
});
