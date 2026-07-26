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
// battle interface) — one per Known Move slot, always four, in slot order
// (see BattleContent's buildAttackSlots). An empty slot (fewer than four
// moves known) renders disabled rather than being omitted, per the Known
// Move slot layout established in features/known-moves. Functionality
// first, no visual redesign: the only addition over the previous
// placeholder button is the disabled state and a small metadata line, both
// read directly off whatever the Move Registry already resolved
// server-side — nothing here reformats or duplicates that data.
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
            disabled={attack.disabled}
            onClick={() => onSelect?.(attack.id)}
            style={focusRingStyle}
            className="group flex flex-col items-start gap-0.5 rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-sm font-semibold tracking-wide text-slate-100 shadow-md transition-all duration-150 hover:border-white/20 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-slate-800/70"
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full transition-transform duration-150 group-hover:scale-125"
                style={{ backgroundColor: theme.colors.panelAccent }}
              />
              <span className="truncate">{attack.name}</span>
            </span>
            {!attack.disabled ? (
              <span className="pr-4 text-[10px] font-normal tracking-normal text-slate-400">
                {attack.type} · {attack.category} · כוח {attack.power ?? "—"} · דיוק {attack.accuracy ?? "—"}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
