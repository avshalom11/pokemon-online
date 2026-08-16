"use server";

import { revalidatePath } from "next/cache";

import { purchaseIncubatorShopItem, type PurchaseIncubatorShopItemResult } from "@/features/shop/services/incubator-shop-purchase.service";
import { purchaseShopItemSchema } from "@/features/shop/validation/purchase-shop-item.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type PurchaseIncubatorShopItemActionResult = PurchaseIncubatorShopItemResult | { status: "error" };

// The Shop's incubator-purchase entry point — same boilerplate as
// purchase-egg-shop-item.action.ts (session -> schema -> profile -> service
// -> revalidatePath), reusing that exact same schema shape (itemId/
// quantity) since it's already generic over any shop item. Deliberately its
// own action rather than a branch inside purchaseShopItemAction/
// purchaseEggShopItemAction: an incubator purchase's real effect
// (grantIncubator) is different enough from both an ordinary item's
// (addInventoryItem) and an egg's (createOwnedEgg) that keeping it separate
// keeps none of the three needing to know about either other's shape.
export async function purchaseIncubatorShopItemAction(
  itemId: string,
  quantity: number
): Promise<PurchaseIncubatorShopItemActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = purchaseShopItemSchema.safeParse({ itemId, quantity });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await purchaseIncubatorShopItem(profile.id, parsed.data.itemId, parsed.data.quantity);

  revalidatePath("/shop");
  revalidatePath("/inventory");
  revalidatePath("/hatchery");
  return result;
}
