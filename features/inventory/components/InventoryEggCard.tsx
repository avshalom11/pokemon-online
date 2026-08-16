import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import type { OwnedEggView } from "@/features/eggs/services/egg-display.service";

const SOURCE_LABELS: Record<string, string> = {
  battle: "קרב שדה",
  shop: "חנות",
  chest: "תיבה",
};

interface InventoryEggCardProps {
  egg: OwnedEggView;
  onSell: (eggId: string) => void;
  disabled: boolean;
}

// EGGS PHASE 6 / INVENTORY SELL — an owned egg's card. Never currently
// incubating (only unassigned eggs reach this card — see the eggs prop's
// own doc comment on InventoryContent), so a sell action is always safe to
// offer. Starting incubation stays exclusively a /hatchery action — this
// component never links there or duplicates that flow, only sells.
export function InventoryEggCard({ egg, onSell, disabled }: InventoryEggCardProps) {
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

      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
        <CurrencyIcon type={egg.sellCurrency} />
        <span dir="ltr">{egg.sellPrice.toLocaleString("he-IL")}</span>
        <span className="text-emerald-400/80">מחיר מכירה</span>
      </span>

      <button
        type="button"
        onClick={() => onSell(egg.id)}
        disabled={disabled}
        className="mt-1 w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors enabled:hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        מכירה
      </button>
    </div>
  );
}
