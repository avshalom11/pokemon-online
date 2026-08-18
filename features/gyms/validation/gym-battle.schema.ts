import * as z from "zod";

import { isValidRegionId } from "@/features/regions/data/region-registry";

// GYMS & LEAGUES PHASE 4 — schema-level validation for the Server Actions
// that start/resolve an NPC battle. Whether a given target is actually
// UNLOCKED is entirely startNpcBattle's own job (it needs DB reads a zod
// schema can't do) — this only rejects a structurally-impossible request
// (an unknown regionId, an out-of-range gymNumber, ...) before it ever
// reaches the service layer, same split executeBattleActionSchema already
// established for Field Battle.
const regionIdSchema = z.string().refine(isValidRegionId, { message: "invalid regionId" });

export const startGymBattleTargetSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("gym"),
    regionId: regionIdSchema,
    gymNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    battleSlot: z.union([z.literal("easy"), z.literal("medium"), z.literal("leader")]),
  }),
  z.object({
    source: z.literal("regional-champion"),
    regionId: regionIdSchema,
  }),
]);

export const executeGymBattleActionSchema = z.object({
  moveId: z.string().min(1),
});

export const switchGymBattleActivePokemonSchema = z.object({
  playerPokemonId: z.string().min(1),
});
