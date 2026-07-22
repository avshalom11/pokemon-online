"use client";

import type { CSSProperties } from "react";

import type { BattleTheme } from "@/shared/types/battle-theme";
import type { BattleAttackSlot } from "@/shared/types/battle-ui";

interface BattleAttackPanelProps {
  theme: BattleTheme;
  attacks: BattleAttackSlot[];
  onSelect?: (attackId: string) => void;
}

// The four attack/move slots (the wide "Attack Panel" on the left of the
// battle interface). Placeholder labels only — no real Move data flows in
// yet, that's a future engine-wiring pass — but the props already accept
// whatever shape real moves will need (id + display name).
export function BattleAttackPanel({ theme, attacks, onSelect }: BattleAttackPanelProps) {
  const focusRingStyle = { "--tw-ring-color": theme.colors.panelAccent } as CSSProperties;

  return (
    <div className="h-full rounded-lg border border-white/10 bg-slate-900/70 p-2.5 shadow-xl backdrop-blur-md sm:p-3">
      <div className="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        התקפות
      </div>

      <div className="grid grid-cols-2 gap-2">
        {attacks.map((attack) => (
          <button
            key={attack.id}
            type="button"
            onClick={() => onSelect?.(attack.id)}
            style={focusRingStyle}
            className="group flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm font-semibold tracking-wide text-slate-100 shadow-md transition-all duration-150 hover:border-white/20 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none active:scale-[0.98]"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full transition-transform duration-150 group-hover:scale-125"
              style={{ backgroundColor: theme.colors.panelAccent }}
            />
            <span className="truncate">{attack.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
