import * as z from "zod";

// Structural validation only — ownership, the pending decision's continued
// existence, and target-species validity are the services' job (see
// accept-evolution.service.ts / reject-evolution.service.ts), since a zod
// schema can't do those lookups.
export const evolutionDecisionSchema = z.object({
  playerPokemonId: z.string().min(1),
});

// Same "structural only" split as evolutionDecisionSchema above — whether
// itemId is actually one of the canonical Evolution-Item ids, and whether
// the target species/item pairing is valid, are accept-evolution-item.
// service.ts's job (data/pokemon/pokemon-evolutions.ts's isEvolutionItemId
// and getEvolutionItemEvolutionByItem).
export const evolutionItemDecisionSchema = z.object({
  playerPokemonId: z.string().min(1),
  itemId: z.string().min(1),
});

// Structural validation for choosing a Branch Evolution target (Eevee's
// Espeon/Umbreon choice) — whether chosenSpeciesId is actually one of the
// canonical branch targets for this Pokémon's current species is
// chooseEvolutionBranch's own job (evolution-progress.service.ts).
export const evolutionBranchChoiceSchema = z.object({
  playerPokemonId: z.string().min(1),
  chosenSpeciesId: z.string().min(1),
});
