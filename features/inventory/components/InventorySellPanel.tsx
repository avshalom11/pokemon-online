import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import type { InventoryItemView } from "@/features/inventory/types/inventory.types";

interface InventorySellPanelProps {
  view: InventoryItemView;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onSellClick: () => void;
  disabled: boolean;
}

const MIN_QUANTITY = 1;

// Appears once an item is selected in InventoryItemGrid — same layout as
// ShopPurchasePanel, but the quantity stepper is capped at how many the
// player actually owns (never MAX_QUANTITY=99 like the Shop's buy side,
// since selling more than owned is meaningless). "מכירה" only ever opens
// InventorySellConfirmDialog — this panel never sells anything itself.
export function InventorySellPanel({ view, quantity, onQuantityChange, onSellClick, disabled }: InventorySellPanelProps) {
  const { item, quantity: owned, sellUnitPrice } = view;
  const totalReturn = sellUnitPrice * quantity;

  function clamp(next: number) {
    return Math.min(owned, Math.max(MIN_QUANTITY, next));
  }

  return (
    <div
      dir="rtl"
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <SpriteImage
          src={item.imageUrl}
          alt={item.name}
          className="h-14 w-14 object-contain"
          fallbackClassName="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
        />
        <div>
          <p className="text-sm font-semibold text-slate-100">{item.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <CurrencyIcon type={item.currency} />
            <span dir="ltr">{sellUnitPrice.toLocaleString("he-IL")}</span>
            <span>ליחידה · {owned} במלאי</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div dir="ltr" className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1">
          <button
            type="button"
            onClick={() => onQuantityChange(clamp(quantity - 1))}
            disabled={disabled || quantity <= MIN_QUANTITY}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-200 disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:bg-white/10"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold text-slate-100">{quantity}</span>
          <button
            type="button"
            onClick={() => onQuantityChange(clamp(quantity + 1))}
            disabled={disabled || quantity >= owned}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-200 disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:bg-white/10"
          >
            +
          </button>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[11px] text-slate-500">{'סה"כ תמורה'}</span>
          <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-300">
            <CurrencyIcon type={item.currency} />
            <span dir="ltr">{totalReturn.toLocaleString("he-IL")}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onSellClick}
          disabled={disabled}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          מכירה
        </button>
      </div>
    </div>
  );
}
