"use server";

import { revalidatePath } from "next/cache";

import { ensureStandardIncubator } from "@/features/eggs/services/incubator.service";
import { startIncubatingEgg, type StartIncubationResult } from "@/features/eggs/services/incubation.service";
import { startIncubationSchema } from "@/features/hatchery/validation/hatchery.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type StartIncubationActionResult = StartIncubationResult | { status: "error" };

// The only write path the Hatchery UI has for placing an egg into the
// player's Standard Incubator — a thin wrapper around the existing
// transactional startIncubatingEgg (features/eggs/services/incubation.
// service.ts), never a client-side/duplicated incubation mechanic. The
// incubator is re-resolved via ensureStandardIncubator (not trusted from
// the client) so an existing player who somehow hasn't loaded /hatchery
// yet still gets one here.
export async function startIncubationAction(ownedEggId: string): Promise<StartIncubationActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = startIncubationSchema.safeParse({ ownedEggId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const incubator = await ensureStandardIncubator(profile.id);
  const result = await startIncubatingEgg(profile.id, incubator.id, parsed.data.ownedEggId);

  revalidatePath("/hatchery");
  return result;
}
