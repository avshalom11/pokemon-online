import * as z from "zod";

// Structural validation only — whether itemId resolves to a real catalog
// entry, and whether the player can afford quantity units of it, are the
// service's job (shop-purchase.service.ts), since a zod schema can't do a
// catalog lookup or a balance check.
export const purchaseShopItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1),
});
