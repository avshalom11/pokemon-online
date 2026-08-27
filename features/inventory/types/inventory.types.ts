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
  // MARKETPLACE PHASE 7 (hardening) — quantity - lockedQuantity: the most
  // the player can actually sell/use right now. Never raw `quantity` for
  // that purpose — a stack partly or fully committed to a Marketplace
  // listing must not be offered (or bounded) beyond what's really free.
  // Equal to `quantity` whenever nothing is locked.
  availableQuantity: number;
  sellUnitPrice: number;
}
