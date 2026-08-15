import type { PokemonRarity } from "@/shared/types/pokemon";

const EGG_MEDIA_ROOT = "/images/eggs";

// Every egg's artwork is derived from its rarity — never a per-egg
// hardcoded URL in the data module, same "one convention, everything else
// follows it automatically" rule features/shop/media/shop-item-media-paths.ts
// (getShopItemImagePath) and features/pokemon/media/pokemon-media-paths.ts
// already established for their own asset domains. A future egg image is
// therefore a PNG dropped at the path this already derives, never a code
// change. Phase 1 only wires up the path formula — the actual PNG assets
// are a placeholder concern the task explicitly defers.
export function getEggImagePath(rarity: PokemonRarity): string {
  return `${EGG_MEDIA_ROOT}/${rarity}.png`;
}
