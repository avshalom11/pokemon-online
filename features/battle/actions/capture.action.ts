"use server";

import { attemptCapture } from "@/features/battle/services/capture.service";
import { attemptCaptureSchema } from "@/features/battle/validation/capture.schema";
import type { LevelUpResult } from "@/features/player-progression/progression-types";
import { getCurrentSession } from "@/lib/auth/auth-session";

export type CaptureActionResult =
  | { status: "captured"; pokemonName: string; xpResult: LevelUpResult; remainingQuantity: number; addedToParty: boolean }
  | { status: "failed"; remainingQuantity: number }
  | { status: "no-balls" }
  | { status: "error" };

// Invoked directly from the battle screen's capture button (not a <form> —
// a plain Server Action call), so the random roll, the ball inventory
// decrement, the session lookup, and the PlayerPokemon write
// (features/battle/services/capture.service.ts) always run server-side.
// The wild Pokémon being captured is resolved entirely from the caller's
// own persisted battle session, never from anything the client sends —
// only which owned ball to throw is client-supplied, and even that is
// re-validated (ownership, quantity, multiplier) against the Shop catalog
// and the player's own inventory inside the service, never trusted as-is.
export async function attemptCaptureAction(ballItemId: string): Promise<CaptureActionResult> {
  const session = await getCurrentSession();

  if (!session) {
    return { status: "error" };
  }

  const parsed = attemptCaptureSchema.safeParse({ ballItemId });
  if (!parsed.success) {
    return { status: "error" };
  }

  const result = await attemptCapture(session.user.id, parsed.data.ballItemId);

  if (result.status === "invalid-encounter" || result.status === "invalid-item") {
    return { status: "error" };
  }

  if (result.status === "no-balls") {
    return { status: "no-balls" };
  }

  if (result.status === "failed") {
    return { status: "failed", remainingQuantity: result.remainingQuantity };
  }

  return {
    status: "captured",
    pokemonName: result.speciesName,
    xpResult: result.xpResult,
    remainingQuantity: result.remainingQuantity,
    addedToParty: result.addedToParty,
  };
}
