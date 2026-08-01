"use server";

import { revalidatePath } from "next/cache";

import { sellInventoryItem, type SellInventoryItemResult } from "@/features/inventory/services/inventory-sell.service";
import { sellInventoryItemSchema } from "@/features/inventory/validation/sell-inventory-item.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type SellInventoryItemActionResult = SellInventoryItemResult | { status: "error" };

export async function sellInventoryItemAction(itemId: string, quantity: number): Promise<SellInventoryItemActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = sellInventoryItemSchema.safeParse({ itemId, quantity });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await sellInventoryItem(profile.id, parsed.data.itemId, parsed.data.quantity);

  revalidatePath("/inventory");
  return result;
}
