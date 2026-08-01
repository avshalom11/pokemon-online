"use client";

import type { CSSProperties, ReactNode } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import type { BattleTheme } from "@/shared/types/battle-theme";
import type { BattleMenuAction } from "@/shared/types/battle-ui";

interface BattleMenuProps {
  theme: BattleTheme;
  actions: BattleMenuAction[];
  onSelect?: (actionId: string) => void;
}

// Small original line icons (not from any icon library or existing game),
// keyed by action id so new actions can add a case without touching layout.
const ACTION_ICONS: Record<string, ReactNode> = {
  attack: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M3 17 L13 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11 4 L16 4 L16 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3 L7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  bag: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M7 7 V5.5 A3 3 0 0 1 13 5.5 V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="3.5" y="7" width="13" height="10" rx="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  monsters: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="4.5" cy="6.5" r="2" fill="currentColor" />
      <circle cx="15.5" cy="6.5" r="2" fill="currentColor" />
    </svg>
  ),
  run: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="8" height="14" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M11 10 H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 7 L17 10 L14 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  // Original "capture orb" glyph — same motif as the empty party-slot icon
  // in features/pokemon/components/PartySlot.tsx (deliberately not a
  // red/white Poké Ball; this project avoids recognizable Pokémon IP).
  capture: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="2" strokeDasharray="2.5 2.5" />
      <circle cx="10" cy="10" r="2.2" fill="currentColor" />
    </svg>
  ),
  // Two opposing curved arrows — a generic "swap" motif for switching the
  // active Pokémon mid-battle.
  switch: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M4 7 H14 M14 7 L11 4 M14 7 L11 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 13 H6 M6 13 L9 10 M6 13 L9 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// The compact "Action Panel" — narrow (~25% width) alongside the wider
// Attack Panel on larger screens. Kept as a 2x2 grid at every size
// (not a single column) so its height stays in step with the Attack
// Panel's own 2-row grid — the two sit side by side as flex siblings, so
// a taller one would stretch the whole footer and squeeze the field area.
export function BattleMenu({ theme, actions, onSelect }: BattleMenuProps) {
  const focusRingStyle = { "--tw-ring-color": theme.colors.panelAccent } as CSSProperties;

  return (
    <div className="h-full rounded-lg border border-white/10 bg-slate-900/70 p-1.5 shadow-xl backdrop-blur-md">
      <div className="mb-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        פעולות
      </div>

      <div className="grid grid-cols-2 gap-1">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onSelect?.(action.id)}
            disabled={action.disabled}
            style={focusRingStyle}
            className="group flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800/70 px-2.5 py-1 text-sm font-semibold tracking-wide text-slate-100 shadow-md transition-all duration-150 hover:border-white/20 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-slate-800/70"
          >
            <span
              className="flex shrink-0 items-center justify-center transition-transform duration-150 group-hover:scale-110"
              style={{ color: theme.colors.panelAccent }}
            >
              {action.iconImageUrl ? (
                <SpriteImage src={action.iconImageUrl} alt="" className="h-[18px] w-[18px] object-contain" />
              ) : (
                (ACTION_ICONS[action.id] ?? null)
              )}
            </span>
            <span className="truncate">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
