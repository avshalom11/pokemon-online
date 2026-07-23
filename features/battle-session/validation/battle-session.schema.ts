import * as z from "zod";

export const syncWildHpSchema = z.object({
  zoneId: z.string().min(1),
  currentHp: z.number().int(),
});

export const syncActivePokemonSchema = z.object({
  playerPokemonId: z.string().min(1),
});
