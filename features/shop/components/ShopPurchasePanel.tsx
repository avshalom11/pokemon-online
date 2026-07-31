import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import type { ShopItem } from "@/features/shop/types/shop.types";

interface ShopPurchasePanelProps {
  item: ShopItem;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onBuyClick: () => void;
  disabled: boolean;
}

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

// Appears once an item is selected in ShopItemGrid — quantity stepper plus
// the automatically-derived total price (steps 2/3 of the shopping flow;
// see ShopContent's own doc comment). "קנייה" only ever opens
// ShopPurchaseConfirmDialog (step 4) — this panel never purchases anything
// itself.
export function ShopPurchasePanel({ item, quantity, onQuantityChange, onBuyClick, disabled }: ShopPurchasePanelProps) {
  const totalPrice = item.price * quantity;

  function clamp(next: number) {
    return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, next));
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
            <span dir="ltr">{item.price.toLocaleString("he-IL")}</span>
            <span>ליחידה</span>
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
            disabled={disabled || quantity >= MAX_QUANTITY}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-200 disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:bg-white/10"
          >
            +
          </button>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[11px] text-slate-500">{'סה"כ'}</span>
          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-100">
            <CurrencyIcon type={item.currency} />
            <span dir="ltr">{totalPrice.toLocaleString("he-IL")}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onBuyClick}
          disabled={disabled}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          קנייה
        </button>
      </div>
    </div>
  );
}
