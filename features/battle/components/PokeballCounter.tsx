import { battleDevelopmentConfig } from "@/engine/battle/battle-config";

// Small corner badge, layered over BattleScene without needing any change
// to it. Reads battleDevelopmentConfig (engine/battle/battle-config.ts)
// rather than hardcoding "∞" here, so swapping in a real ball count later
// is a one-line change to that single flag, not a hunt through components.
export function PokeballCounter() {
  const label = battleDevelopmentConfig.unlimitedPokeballs ? "∞" : "0";

  return (
    <div
      dir="rtl"
      className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur-md sm:right-4 sm:top-4"
    >
      פוכדורים: <span dir="ltr">{label}</span>
    </div>
  );
}
