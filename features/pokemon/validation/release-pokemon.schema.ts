import * as z from "zod";

export const releasePokemonSchema = z.object({
  playerPokemonId: z.string().min(1),
});
