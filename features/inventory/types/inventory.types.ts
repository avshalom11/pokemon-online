import type { ShopItem } from "@/features/shop/types/shop.types";

// A single owned-item row for display, composed at read time from a
// PlayerInventoryItem row's quantity plus its matching canonical Shop
// catalog entry (features/shop/data/shop-items.ts) — never a duplicated
// item definition. sellUnitPrice is always derived server-side from the
// catalog's price (floor(price * 0.5)), the same value the sell service
// itself charges, so the UI can never show a number the server wouldn't
// also compute.
export interface InventoryItemView {
  item: ShopItem;
  quantity: number;
  sellUnitPrice: number;
}
