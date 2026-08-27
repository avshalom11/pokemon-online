import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import type { MarketplaceListingView } from "@/features/marketplace/services/marketplace-view.service";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { PlayerProfileLink } from "@/features/profile/components/PlayerProfileLink";

interface MarketplaceListingCardProps {
  listing: MarketplaceListingView;
  onClick: () => void;
}

// How many Pokémon/item thumbnails a browse card shows before collapsing
// the rest into a "+N" badge — the full set is always in
// MarketplaceListingDetailModal (opened by clicking this card), so nothing
// is ever hidden, only summarized for a scannable grid.
const MAX_PREVIEW_THUMBNAILS = 4;

// MARKETPLACE PHASE 3 — one browse-grid entry: seller, a preview of the
// bundled Pokémon/items, and the price. Reuses PlayerProfileLink (the ONE
// existing way any surface links to a player's public profile) and
// SpriteImage (the ONE existing fallback-aware sprite/icon renderer) rather
// than inventing new ones — same "reuse, don't reinvent" posture every
// other card in this codebase already follows (ShopItemCard, PokemonCard).
export function MarketplaceListingCard({ listing, onClick }: MarketplaceListingCardProps) {
  const previewPokemon = listing.pokemon.slice(0, MAX_PREVIEW_THUMBNAILS);
  const extraPokemonCount = listing.pokemon.length - previewPokemon.length;
  const previewItems = listing.items.slice(0, MAX_PREVIEW_THUMBNAILS);
  const extraItemCount = listing.items.length - previewItems.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-right transition-colors hover:border-indigo-400/50 hover:bg-slate-900/80"
    >
      <div className="flex items-center justify-between gap-2">
        <PlayerProfileLink username={listing.sellerUsername} className="truncate text-sm font-semibold text-slate-100 hover:underline">
          {listing.sellerDisplayName}
        </PlayerProfileLink>
        <span className="shrink-0 text-[11px] text-slate-500">{new Date(listing.createdAt).toLocaleDateString("he-IL")}</span>
      </div>

      {previewPokemon.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {previewPokemon.map((pokemon) => (
            <SpriteImage
              key={pokemon.id}
              src={getFrontSpritePath(pokemon.species)}
              alt={pokemon.nickname ?? pokemon.species.name}
              className="h-10 w-10 object-contain"
              fallbackClassName="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
            />
          ))}
          {extraPokemonCount > 0 ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-800/60 text-xs font-semibold text-slate-300">
              {`+${extraPokemonCount}`}
            </span>
          ) : null}
        </div>
      ) : null}

      {previewItems.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {previewItems.map(({ item, quantity }) => (
            <span key={item.id} className="relative">
              <SpriteImage
                src={item.imageUrl}
                alt={item.name}
                className="h-8 w-8 object-contain"
                fallbackClassName="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
              />
              <span className="absolute -bottom-1 -left-1 rounded-full bg-slate-950 px-1 text-[9px] font-bold text-slate-200 ring-1 ring-white/20">
                {quantity}
              </span>
            </span>
          ))}
          {extraItemCount > 0 ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800/60 text-xs font-semibold text-slate-300">
              {`+${extraItemCount}`}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3 border-t border-white/10 pt-2">
        {listing.priceMoney > 0 ? (
          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-100">
            <CurrencyIcon type="money" />
            <span dir="ltr">{listing.priceMoney.toLocaleString("he-IL")}</span>
          </span>
        ) : null}
        {listing.priceGold > 0 ? (
          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-100">
            <CurrencyIcon type="gold" />
            <span dir="ltr">{listing.priceGold.toLocaleString("he-IL")}</span>
          </span>
        ) : null}
      </div>
    </button>
  );
}
