import * as z from "zod";

// Structural validation only — whether eggId resolves to a real, owned,
// unassigned egg is the service's job (sell-egg.service.ts), never this
// schema's. Same shape convention as hatchery.schema.ts's startIncubationSchema.
export const sellEggSchema = z.object({
  eggId: z.string().min(1),
});
