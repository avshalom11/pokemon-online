"use server";

import { revalidatePath } from "next/cache";

import { startIncubatingEgg, type StartIncubationResult } from "@/features/eggs/services/incubation.service";
import { startIncubationSchema } from "@/features/hatchery/validation/hatchery.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type StartIncubationActionResult = StartIncubationResult | { status: "error" };

// The only write path the Hatchery UI has for placing an egg into one of
// the player's owned incubators — a thin wrapper around the existing
// transactional startIncubatingEgg (features/eggs/services/incubation.
// service.ts), never a client-side/duplicated incubation mechanic.
// INCUBATOR EXPANSION — the target incubator is now an explicit,
// client-chosen parameter (the player picks which owned incubator receives
// the egg via the Hatchery's own picker UI); startIncubatingEgg's own
// ownership check is what actually guards against a spoofed/foreign
// incubatorId, this action never trusts the client beyond structural
// validation.
export async function startIncubationAction(ownedEggId: string, incubatorId: string): Promise<StartIncubationActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = startIncubationSchema.safeParse({ ownedEggId, incubatorId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await startIncubatingEgg(profile.id, parsed.data.incubatorId, parsed.data.ownedEggId);

  revalidatePath("/hatchery");
  return result;
}
