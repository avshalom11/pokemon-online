interface BattleResultOverlayProps {
  variant: "won" | "lost" | "captured";
  title: string;
  message: string;
  onReturnToMap: () => void;
}

const VARIANT_STYLES: Record<BattleResultOverlayProps["variant"], { icon: string; accent: string }> = {
  won: { icon: "🏆", accent: "#4ade80" },
  captured: { icon: "✨", accent: "#818cf8" },
  lost: { icon: "💫", accent: "#f87171" },
};

// Centered modal (same overlay idiom already established by
// PokemonDetailsPanel/ConfirmStarterDialog), shown for every battle-ending
// state (victory, defeat, capture). Scoped to the battle panel itself
// (absolute inset-0, not fixed inset-0) — BattleContent renders this as a
// sibling inside BattleWindow's panel, so the dim/blur only covers the
// game window, not the whole page behind it, matching the "floating game
// window" framing. Its opaque backdrop is what "disables further attack
// and capture actions" — the panels underneath are still technically
// mounted but fully covered and unreachable, so nothing else needs its own
// disabled state once this is showing. The single button here is the only
// way out, and always returns to /map via router.replace (see
// BattleContent), never leaving a finished battle in browser history.
export function BattleResultOverlay({ variant, title, message, onReturnToMap }: BattleResultOverlayProps) {
  const { icon, accent } = VARIANT_STYLES[variant];

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-6 text-center shadow-2xl"
        style={{ boxShadow: `0 0 40px -8px ${accent}66` }}
      >
        <div className="mb-2 text-4xl">{icon}</div>
        <h2 className="mb-2 text-xl font-bold text-slate-50">{title}</h2>
        <p className="mb-6 text-sm text-slate-300">{message}</p>

        <button
          type="button"
          onClick={onReturnToMap}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          חזרה למפה
        </button>
      </div>
    </div>
  );
}
