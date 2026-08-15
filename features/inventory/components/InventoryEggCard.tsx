import { SpriteImage } from "@/components/media/SpriteImage";
import type { OwnedEggView } from "@/features/eggs/services/egg-display.service";

const SOURCE_LABELS: Record<string, string> = {
  battle: "קרב שדה",
  shop: "חנות",
};

interface InventoryEggCardProps {
  egg: OwnedEggView;
}

// EGGS PHASE 6 — a purely read-only ownership card (no action button of
// any kind): the Inventory page only ever shows what the player owns.
// Starting incubation stays exclusively a /hatchery action — this
// component never links there or duplicates that flow.
export function InventoryEggCard({ egg }: InventoryEggCardProps) {
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
    </div>
  );
}
