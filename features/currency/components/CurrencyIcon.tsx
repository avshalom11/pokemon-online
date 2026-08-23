import type { CurrencyType } from "@/features/currency/types/currency.types";

// The one place either currency's artwork is ever defined — so the
// header's currency pills (components/layout/GameHeader.tsx) and the
// Shop's item price tags (features/shop/components/ShopItemCard.tsx) can
// never drift out of sync with each other. Real Money/Gold coin images
// (public/images/currency/) replace the plain colored-dot placeholder this
// component originally rendered before matching art existed.
const CURRENCY_IMAGE_PATHS: Record<CurrencyType, string> = {
  money: "/images/currency/money.png",
  gold: "/images/currency/gold.png",
};

const CURRENCY_LABELS: Record<CurrencyType, string> = {
  money: "מטבעות כסף",
  gold: "מטבעות זהב",
};

// Per-currency glow color — bright silver/white for Money (metallic),
// bright warm gold/yellow for Gold. Applied via `filter: drop-shadow(...)`,
// not `box-shadow`: drop-shadow follows the PNG's own alpha silhouette
// (the coin's actual round shape), so the glow hugs the artwork itself
// rather than glowing a rectangle around it.
const CURRENCY_GLOW_COLORS: Record<CurrencyType, string> = {
  money: "#f8fafc",
  gold: "#ffcc33",
};

// Three stacked drop-shadows per icon — a bright tight core, a stronger
// mid spread, and a wide soft outer halo — for a clearly luminous glow
// (louder than a single subtle shadow) that still fades out cleanly
// rather than reading as a hard, overpowering ring.
function glowFilter(color: string): string {
  return [
    `drop-shadow(0 0 3px ${color})`,
    `drop-shadow(0 0 8px ${color}dd)`,
    `drop-shadow(0 0 16px ${color}99)`,
  ].join(" ");
}

interface CurrencyIconProps {
  type: CurrencyType;
  className?: string;
}

// A small coin icon — the one shared visual identity for both currencies
// everywhere they're shown. Never hardcode a currency's image directly in
// a caller; render this instead so every future currency display
// automatically stays visually consistent (size, spacing, glow) with
// every other one, and a future third currency only ever needs one new
// entry in CURRENCY_IMAGE_PATHS/CURRENCY_LABELS/CURRENCY_GLOW_COLORS
// above.
//
// aria-hidden — every existing call site already wraps this icon in its
// own element carrying a real accessible label (e.g. ResourcePill's own
// `title` in GameHeader.tsx), same posture the original colored-dot
// version already had; `alt` is still set to the real Hebrew label rather
// than left empty, so the image remains meaningful on its own if a future
// caller ever renders it outside that context.
export function CurrencyIcon({ type, className = "h-[18px] w-[18px]" }: CurrencyIconProps) {
  const glow = CURRENCY_GLOW_COLORS[type];

  return (
    <img
      src={CURRENCY_IMAGE_PATHS[type]}
      alt={CURRENCY_LABELS[type]}
      className={`inline-block shrink-0 object-contain ${className}`}
      style={{ filter: glowFilter(glow) }}
      aria-hidden="true"
    />
  );
}
