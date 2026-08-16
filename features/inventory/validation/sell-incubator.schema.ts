import * as z from "zod";

// Structural validation only — whether incubatorTypeId resolves to a real
// catalog entry, and whether the player owns a sellable (consumable,
// non-active) instance of it, are the service's job (sell-incubator.
// service.ts), never this schema's. Same shape convention as
// features/hatchery/validation/hatchery.schema.ts.
export const sellIncubatorSchema = z.object({
  incubatorTypeId: z.string().min(1),
});
