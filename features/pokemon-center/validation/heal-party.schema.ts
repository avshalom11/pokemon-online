import * as z from "zod";

// Same style as features/party/validation/party.schema.ts. A non-empty,
// duplicate-free list of PlayerPokemon ids — ownership and active-party
// membership are re-checked server-side (features/pokemon-center/services/
// heal-party.service.ts), this only enforces the request shape itself.
export const healPartySchema = z.object({
  playerPokemonIds: z
    .array(z.string().min(1))
    .min(1, { error: "יש לבחור לפחות פוקימון אחד." })
    .refine((ids) => new Set(ids).size === ids.length, {
      error: "רשימת הפוקימונים מכילה כפילויות.",
    }),
});
