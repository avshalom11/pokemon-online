"use server";

import { attemptCapture } from "@/features/battle/services/capture.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import type { ZoneId } from "@/shared/types/zone";

export interface CaptureActionParams {
  zoneId: ZoneId;
  speciesId: string;
  level: number;
  currentHp: number;
}

export type CaptureActionResult =
  | { status: "captured"; pokemonName: string }
  | { status: "failed" }
  | { status: "error" };

// Invoked directly from the battle screen's capture button (not a <form> —
// a plain Server Action call), so the random roll and the PlayerPokemon
// write (features/battle/services/capture.service.ts) always run
// server-side. This is what makes "the client cannot force a successful
// capture" true: the client can only ask for a roll, never supply one.
export async function attemptCaptureAction(params: CaptureActionParams): Promise<CaptureActionResult> {
  const session = await getCurrentSession();

  if (!session) {
    return { status: "error" };
  }

  const result = await attemptCapture({ userId: session.user.id, ...params });

  if (result.status === "invalid-encounter") {
    return { status: "error" };
  }

  if (result.status === "failed") {
    return { status: "failed" };
  }

  return { status: "captured", pokemonName: result.speciesName };
}
