"use server";

import { revalidatePath } from "next/cache";

import { openChest } from "@/features/chests/services/chest-open.service";
import type { OpenChestResult } from "@/features/chests/types/chest-open.types";
import { openChestSchema } from "@/features/chests/validation/open-chest.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type OpenChestActionResult = OpenChestResult | { status: "error" };

// The only write path the (future Phase 4) UI will have for opening one
// owned chest — a thin wrapper around the existing transactional
// openChest (features/chests/services/chest-open.service.ts), same
// session -> schema -> profile -> service -> revalidatePath shape every
// other action in this project already follows. Never passes randomSource
// or rewardsOverride through from the client — those are test-only seams
// on the service itself; real gameplay always rolls with Math.random.
export async function openChestAction(chestTypeId: string): Promise<OpenChestActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = openChestSchema.safeParse({ chestTypeId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await openChest(profile.id, parsed.data.chestTypeId);

  revalidatePath("/inventory");
  return result;
}
