"use server";

import { revalidatePath } from "next/cache";

import { purchaseShopItem, type PurchaseShopItemResult } from "@/features/shop/services/shop-purchase.service";
import { purchaseShopItemSchema } from "@/features/shop/validation/purchase-shop-item.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type PurchaseShopItemActionResult = PurchaseShopItemResult | { status: "error" };

export async function purchaseShopItemAction(itemId: string, quantity: number): Promise<PurchaseShopItemActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = purchaseShopItemSchema.safeParse({ itemId, quantity });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await purchaseShopItem(profile.id, parsed.data.itemId, parsed.data.quantity);

  revalidatePath("/shop");
  return result;
}
