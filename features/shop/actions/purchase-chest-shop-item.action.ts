"use server";

import { revalidatePath } from "next/cache";

import { purchaseChestShopItem, type PurchaseChestShopItemResult } from "@/features/shop/services/chest-shop-purchase.service";
import { purchaseShopItemSchema } from "@/features/shop/validation/purchase-shop-item.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type PurchaseChestShopItemActionResult = PurchaseChestShopItemResult | { status: "error" };

// The Shop's chest-purchase entry point — same boilerplate as
// purchase-incubator-shop-item.action.ts (session -> schema -> profile ->
// service -> revalidatePath), reusing that exact same schema shape
// (itemId/quantity). Deliberately its own action rather than a branch
// inside any other purchase action: a chest purchase's real effect
// (grantChest) is different enough from an ordinary item's/egg's/
// incubator's own that keeping it separate keeps none of them needing to
// know about the others' shape.
export async function purchaseChestShopItemAction(itemId: string, quantity: number): Promise<PurchaseChestShopItemActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = purchaseShopItemSchema.safeParse({ itemId, quantity });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await purchaseChestShopItem(profile.id, parsed.data.itemId, parsed.data.quantity);

  revalidatePath("/shop");
  revalidatePath("/inventory");
  return result;
}
