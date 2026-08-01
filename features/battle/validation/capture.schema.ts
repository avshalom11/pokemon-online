import * as z from "zod";

// Structural validation only — whether ballItemId resolves to a real
// Poké Balls catalog entry, and whether the player owns at least one, are
// the service's job (capture.service.ts), since a zod schema can't do a
// catalog lookup or an inventory check.
export const attemptCaptureSchema = z.object({
  ballItemId: z.string().min(1),
});
