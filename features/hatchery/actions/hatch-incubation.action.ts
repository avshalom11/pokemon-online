"use server";

import { revalidatePath } from "next/cache";

import { hatchIncubation, type HatchIncubationResult } from "@/features/eggs/services/hatch.service";
import { hatchIncubationSchema } from "@/features/hatchery/validation/hatchery.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type HatchIncubationActionResult = HatchIncubationResult | { status: "error" };

// The only trigger for a hatch anywhere in the app — a thin wrapper around
// the existing transactional hatchIncubation (features/eggs/services/
// hatch.service.ts). Never auto-called: this only ever runs from the
// player's own explicit "בקע ביצה" click (HatcheryContent.tsx). Server-side
// double-hatch protection lives entirely in hatchIncubation's own guarded
// transaction — this action adds no additional locking of its own, since
// that would just be a second, redundant safety mechanism.
export async function hatchIncubationAction(incubationId: string): Promise<HatchIncubationActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = hatchIncubationSchema.safeParse({ incubationId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await hatchIncubation(profile.id, parsed.data.incubationId);

  revalidatePath("/hatchery");
  return result;
}
