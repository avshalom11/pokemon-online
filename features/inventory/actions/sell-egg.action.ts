"use server";

import { revalidatePath } from "next/cache";

import { sellOwnedEgg, type SellEggResult } from "@/features/inventory/services/sell-egg.service";
import { sellEggSchema } from "@/features/inventory/validation/sell-egg.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type SellEggActionResult = SellEggResult | { status: "error" };

// The only write path the Inventory UI has for selling an owned,
// unassigned egg — a thin wrapper around the existing transactional
// sellOwnedEgg (features/inventory/services/sell-egg.service.ts), same
// session -> schema -> profile -> service -> revalidatePath shape every
// other Inventory/Shop action already follows.
export async function sellEggAction(eggId: string): Promise<SellEggActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = sellEggSchema.safeParse({ eggId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await sellOwnedEgg(profile.id, parsed.data.eggId);

  revalidatePath("/inventory");
  return result;
}
