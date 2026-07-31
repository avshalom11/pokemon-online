import type { ShopCategoryId } from "@/features/shop/types/shop.types";

const SHOP_ITEM_MEDIA_ROOT = "/images/items";

// Every shop item's artwork lives at a path derived from its category +
// item id — never a per-item hardcoded URL in the data module (same "one
// convention, everything else follows it automatically" rule
// features/pokemon/media/pokemon-media-paths.ts already established for
// species sprites). Adding a new item is therefore just a new data entry
// (features/shop/data/shop-items.ts) plus a PNG dropped at the path this
// already derives — no code change. public/images/items/<categoryId>/ is
// organized by category for exactly this reason: it's easy to see at a
// glance which folder a new item's art belongs in.
export function getShopItemImagePath(categoryId: ShopCategoryId, itemId: string): string {
  return `${SHOP_ITEM_MEDIA_ROOT}/${categoryId}/${itemId}.png`;
}
