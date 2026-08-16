import * as z from "zod";

// Structural validation only — whether the id resolves to a real, ready,
// player-owned egg/incubation is the service's job
// (startIncubatingEgg/hatchIncubation), never this schema's.
export const startIncubationSchema = z.object({
  ownedEggId: z.string().min(1),
  // INCUBATOR EXPANSION — the player now owns several incubator instances,
  // so the client must say which one an egg goes into: startIncubatingEgg
  // (incubation.service.ts) never auto-picks the fastest/first one.
  incubatorId: z.string().min(1),
});

export const hatchIncubationSchema = z.object({
  incubationId: z.string().min(1),
});
