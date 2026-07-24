interface XpToastProps {
  message: string | null;
}

// Brief, non-blocking player-XP feedback — a small corner badge layered
// over BattleScene, same idiom as PokeballCounter.tsx (pointer-events-none
// absolute, no interaction, never intercepts clicks on the attack/menu
// panels below). Top-center, clear of the enemy HUD card (top-left) and
// PokeballCounter (top-right). Renders nothing when there's no message —
// BattleContent owns the show/auto-dismiss timing
// (features/battle/utils/battle-timing.ts's XP_TOAST_DURATION_MS).
export function XpToast({ message }: XpToastProps) {
  if (!message) return null;

  return (
    <div
      dir="rtl"
      className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-md sm:top-4"
    >
      {message}
    </div>
  );
}
