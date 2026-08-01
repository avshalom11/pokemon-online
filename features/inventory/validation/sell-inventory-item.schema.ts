import * as z from "zod";

// Structural validation only — whether itemId resolves to a real catalog
// entry, and whether the player owns at least `quantity` units of it, are
// the service's job (inventory-sell.service.ts), since a zod schema can't
// do a catalog lookup or an ownership check. Same shape as
// features/shop/validation/purchase-shop-item.schema.ts.
export const sellInventoryItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1),
});
