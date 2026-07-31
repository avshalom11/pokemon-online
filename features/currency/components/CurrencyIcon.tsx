import type { CurrencyType } from "@/features/currency/types/currency.types";

// The one place either currency's color is ever defined — so the header's
// currency pills (components/layout/GameHeader.tsx) and the Shop's item
// price tags (features/shop/components/ShopItemCard.tsx) can never drift
// out of sync with each other. Both currencies share the exact same coin
// shape/size/glow (see CurrencyIcon below); only this color differs, so a
// glance at color alone is what tells them apart. Gold keeps the warm
// gold hue Money itself used before this swap; Money is now silver/gray —
// a common, everyday coin next to gold's rare, premium one.
const CURRENCY_COLORS: Record<CurrencyType, string> = {
  money: "#cbd5e1",
  gold: "#facc15",
};

interface CurrencyIconProps {
  type: CurrencyType;
  className?: string;
}

// A small circular "coin" — the one shared visual identity for both
// currencies everywhere they're shown. Never hardcode a currency's
// color/shape directly in a caller; render this instead so every future
// currency display automatically stays visually consistent (size, shape,
// spacing, glow) with every other one, and a future third currency only
// ever needs one new entry in CURRENCY_COLORS above.
export function CurrencyIcon({ type, className = "h-2.5 w-2.5" }: CurrencyIconProps) {
  const color = CURRENCY_COLORS[type];

  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}aa` }}
      aria-hidden="true"
    />
  );
}
