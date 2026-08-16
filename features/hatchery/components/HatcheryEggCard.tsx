import { SpriteImage } from "@/components/media/SpriteImage";
import type { HatcheryEggView } from "@/features/hatchery/services/hatchery-view.service";

const SOURCE_LABELS: Record<string, string> = {
  battle: "קרב שדה",
  shop: "חנות",
  chest: "תיבה",
};

interface HatcheryEggCardProps {
  egg: HatcheryEggView;
  disabled: boolean;
  onPlaceInIncubator: (eggId: string) => void;
}

// One available (not currently incubating) egg — image, rarity/name,
// region, source, and the one action this card offers: place it in the
// player's (currently empty) incubator. Never shown for an egg with an
// active incubation — HatcheryContent only ever passes availableEggs
// (hatchery-view.service.ts's own listOwnedEggs-backed list) here.
export function HatcheryEggCard({ egg, disabled, onPlaceInIncubator }: HatcheryEggCardProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-center">
      <SpriteImage
        src={egg.imageUrl}
        alt={egg.displayName}
        className="h-16 w-16 object-contain sm:h-20 sm:w-20"
        fallbackClassName="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 sm:h-20 sm:w-20"
      />
      <span className="text-sm font-semibold text-slate-100">{egg.displayName}</span>
      <span className="text-[11px] text-slate-400">{egg.regionLabel}</span>
      {egg.source ? <span className="text-[10px] text-slate-500">מקור: {SOURCE_LABELS[egg.source] ?? egg.source}</span> : null}

      <button
        type="button"
        onClick={() => onPlaceInIncubator(egg.id)}
        disabled={disabled}
        className="mt-1 w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        הכנס לאינקובטור
      </button>
    </div>
  );
}
