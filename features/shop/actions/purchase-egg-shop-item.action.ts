"use server";

import { revalidatePath } from "next/cache";

import { purchaseEggShopItem, type PurchaseEggShopItemResult } from "@/features/shop/services/egg-shop-purchase.service";
import { purchaseShopItemSchema } from "@/features/shop/validation/purchase-shop-item.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type PurchaseEggShopItemActionResult = PurchaseEggShopItemResult | { status: "error" };

// The Shop's egg-purchase entry point — same boilerplate as
// purchase-shop-item.action.ts (session -> schema -> profile -> service ->
// revalidatePath), reusing that exact same schema shape (itemId/quantity)
// since it's already generic over any shop item. Deliberately its own
// action rather than a branch inside purchaseShopItemAction: an egg
// purchase's real effect (createOwnedEgg, region-stamped) is different
// enough from every other item's (addInventoryItem) that keeping them
// separate keeps neither function needing to know about the other's shape.
export async function purchaseEggShopItemAction(itemId: string, quantity: number): Promise<PurchaseEggShopItemActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = purchaseShopItemSchema.safeParse({ itemId, quantity });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await purchaseEggShopItem(profile.id, parsed.data.itemId, parsed.data.quantity);

  revalidatePath("/shop");
  revalidatePath("/inventory");
  revalidatePath("/hatchery");
  return result;
}
