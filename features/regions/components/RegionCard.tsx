import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";

interface RegionCardProps {
  hebrewName: string;
  travelCost: number;
  cardImageSrc: string;
  isActive: boolean;
  isPending: boolean;
  onSelect: () => void;
}

// One region tile on the World page — same visual language as
// features/home/components/NavigationCard.tsx (rounded-2xl bordered tile),
// with an "active" state instead of that card's "coming soon" state, since
// every region here is already selectable. The card image always comes from
// the Region Registry (RegionDefinition.cardImageSrc, now each region's own
// starter-trio artwork — see region-starter-media-paths.ts) — this
// component never hardcodes an image path itself. `travelCost` is likewise
// never hardcoded here — it's resolved once, server-side, from
// region-travel-cost.config.ts (the same central config the real charge
// itself reads) and passed down as a plain prop, same pattern
// `hebrewName` (shared/types/region-labels.ts) already follows.
//
// REGION STARTER IMAGES — the 9 uploaded PNGs are NOT guaranteed to share
// the same pixel dimensions/aspect ratio, and any of them may be
// temporarily missing. The fixed-height wrapper below (`h-20 sm:h-24` —
// enlarged from an earlier `h-12 sm:h-16`, which left the starter artwork
// looking cramped/too small) + SpriteImage's own `object-contain` sizing
// is what normalizes that: every card reports the exact same size
// regardless of its own image's real dimensions, the artwork is scaled
// down/up to fit WITHOUT cropping or stretching (never object-cover,
// which would crop a differently-proportioned starter trio), and is
// centered within the frame by the wrapper's own flex centering. The
// card's own height (`h-40 sm:h-48`) grew alongside the image frame so
// the name and cost lines below it keep their own comfortable space
// rather than getting squeezed. SpriteImage itself already provides the
// "temporarily missing" fallback (a dashed placeholder box, same
// component onboarding's starter-pick screen already reuses for exactly
// this kind of "art may not exist yet" case) — no separate fallback
// logic needed here.
export function RegionCard({ hebrewName, travelCost, cardImageSrc, isActive, isPending, onSelect }: RegionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isPending}
      aria-pressed={isActive}
      className={`group relative flex h-40 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border p-3 text-center transition-all disabled:cursor-wait disabled:opacity-70 sm:h-48 ${
        isActive
          ? "border-indigo-400/60 bg-indigo-500/10 text-slate-100 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          : "border-white/10 bg-slate-900/60 text-slate-100 hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-slate-900/80 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]"
      }`}
    >
      <div className="flex h-20 w-full items-center justify-center sm:h-24">
        <SpriteImage
          src={cardImageSrc}
          alt=""
          className="max-h-full max-w-full rounded-lg object-contain"
          fallbackClassName="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
        />
      </div>
      <span className="text-sm font-semibold">{hebrewName}</span>
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <CurrencyIcon type="money" className="h-3.5 w-3.5" />
        {travelCost.toLocaleString("he-IL")} כסף
      </span>

      {isActive ? (
        <span className="absolute top-2 rounded-full bg-indigo-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
          פעיל
        </span>
      ) : null}
    </button>
  );
}
