"use server";

import { attemptCapture } from "@/features/battle/services/capture.service";
import { getCurrentSession } from "@/lib/auth/auth-session";

export type CaptureActionResult =
  | { status: "captured"; pokemonName: string }
  | { status: "failed" }
  | { status: "error" };

// Invoked directly from the battle screen's capture button (not a <form> —
// a plain Server Action call), so the random roll, the session lookup, and
// the PlayerPokemon write (features/battle/services/capture.service.ts)
// always run server-side. Deliberately takes no parameters: the wild
// Pokémon being captured is resolved entirely from the caller's own
// persisted battle session, never from anything the client sends — this is
// what makes "the client cannot force a successful capture, or capture a
// species/level it isn't actually fighting" true.
export async function attemptCaptureAction(): Promise<CaptureActionResult> {
  const session = await getCurrentSession();

  if (!session) {
    return { status: "error" };
  }

  const result = await attemptCapture(session.user.id);

  if (result.status === "invalid-encounter") {
    return { status: "error" };
  }

  if (result.status === "failed") {
    return { status: "failed" };
  }

  return { status: "captured", pokemonName: result.speciesName };
}
