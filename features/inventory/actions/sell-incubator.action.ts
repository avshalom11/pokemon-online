"use server";

import { revalidatePath } from "next/cache";

import type { IncubatorTypeId } from "@/features/eggs/data/incubator-definitions";
import { sellOwnedIncubator, type SellIncubatorResult } from "@/features/inventory/services/sell-incubator.service";
import { sellIncubatorSchema } from "@/features/inventory/validation/sell-incubator.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type SellIncubatorActionResult = SellIncubatorResult | { status: "error" };

// The only write path the Inventory UI has for selling one consumable
// incubator of a given type — a thin wrapper around the existing
// transactional sellOwnedIncubator (features/inventory/services/
// sell-incubator.service.ts), same session -> schema -> profile -> service
// -> revalidatePath shape every other Inventory/Shop action already
// follows. The permanent starter incubator is never reachable through this
// action — sellOwnedIncubator's own guarded delete rejects it regardless
// of what the client sends.
export async function sellIncubatorAction(incubatorTypeId: string): Promise<SellIncubatorActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = sellIncubatorSchema.safeParse({ incubatorTypeId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await sellOwnedIncubator(profile.id, parsed.data.incubatorTypeId as IncubatorTypeId);

  revalidatePath("/inventory");
  return result;
}
