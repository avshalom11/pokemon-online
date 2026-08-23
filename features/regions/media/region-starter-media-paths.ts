import type { RegionId } from "@/shared/types/region";

const REGION_STARTER_IMAGE_ROOT = "/images/regions/starters";

// Each region's own starter-trio artwork on the World page's region cards
// — one uploaded PNG per region, never generated/edited here. Path is
// derived purely from the region's own id, same "one convention,
// everything else follows automatically" rule
// features/shop/media/shop-item-media-paths.ts already establishes for
// its own asset tree: adding/replacing a region's art is just dropping a
// PNG at this path, no code change. Source images are NOT guaranteed to
// share the same pixel dimensions/aspect ratio — RegionCard.tsx's own
// fixed-height, object-contain display frame is what normalizes that, not
// this function.
export function getRegionStarterImagePath(regionId: RegionId): string {
  return `${REGION_STARTER_IMAGE_ROOT}/${regionId}.png`;
}
