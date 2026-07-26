import * as z from "zod";

// "attack" is the only supported action today — a literal, not a free-form
// string, so the schema itself is what the Server Action's "invalid
// action" rejection is built on. Future phases add more literals here
// rather than widening this to z.string().
export const battleActionTypeSchema = z.literal("attack");

// Phase 5A: every "attack" action now carries the moveId the player
// selected from their Known Moves — "battle action + moveId instead of a
// generic attack" (see battle-action.service.ts's own doc comment). Just a
// non-empty string at the schema level; whether it's a real registry move
// the active Pokémon actually knows is the service's job (it needs a
// database/registry lookup a zod schema can't do).
export const executeBattleActionSchema = z.object({
  zoneId: z.string().min(1),
  actionType: battleActionTypeSchema,
  moveId: z.string().min(1),
});
