"use client";

import type { ReactNode } from "react";

import { ExperienceBar } from "@/components/battle/ExperienceBar";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import type { NotificationBellData } from "@/features/notifications/types";
import { usePlayerProgression } from "@/features/player/context/player-progression-context";
import type { PlayerHeaderData } from "@/features/player/services/player-header-data.service";
import { logoutAction } from "@/lib/auth/actions";

interface GameHeaderProps {
  player: PlayerHeaderData;
  notifications: NotificationBellData;
}

// The global game header — rendered once by app/(game)/layout.tsx, shown on
// every authenticated game page (Home, Map, Battle, My Pokémon, Pokémon
// Center). Absorbs what used to be features/home/components/HomeHeader.tsx
// (Home/My Pokémon/Pokémon Center's version) and this file's own previous
// minimal placeholder (Map/Battle's version) into one component, per this
// file's own earlier doc comment anticipating exactly this.
//
// Fixed-position (not sticky) — kept intentionally: BattleWindow.tsx embeds
// --app-header-height inside an aspect-ratio-preserving min()/calc() width
// formula for the battle panel, not simple padding, so switching to sticky
// would mean redesigning that formula and touching battle's visual sizing.
// Every consumer (GameScreen, BattleWindow, MapContent) already reserves
// space for this exact fixed header via the shared --app-header-height CSS
// variable, so this component drops into that existing gap unchanged.
//
// --app-header-height is taller on mobile (see app/globals.css) so the XP
// bar + numeric progress can sit on their own row instead of being hidden —
// every consumer reads the same variable, so they all adapt automatically.
export function GameHeader({ player, notifications }: GameHeaderProps) {
  // Level/XP come from the shared client-side progression context, not
  // straight off `player` — see player-progression-context.tsx's own doc
  // comment for why: it's what lets a battle reward update this bar live,
  // without a refresh, while displayName/trainerId/coins/gold (rarely
  // change mid-session) still come directly from the server-rendered prop.
  const { progress } = usePlayerProgression();
  const avatarInitial = player.displayName.trim().charAt(0).toUpperCase() || "?";
  const remainingXp = progress.xpRequiredForNextLevel - progress.currentLevelXp;
  const remainingXpLabel = `נותרו ${remainingXp} XP לרמה הבאה`;

  return (
    <header
      dir="rtl"
      className="fixed inset-x-0 top-0 z-50 flex flex-col justify-center gap-1 border-b border-white/10 bg-slate-950/90 px-3 backdrop-blur-md sm:justify-center sm:px-6"
      style={{ height: "var(--app-header-height)" }}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-[0_0_12px_rgba(129,90,238,0.55)] sm:h-11 sm:w-11">
            {avatarInitial}
            <span className="absolute -bottom-1 -left-1 rounded-full border border-slate-950 bg-indigo-400 px-1.5 py-0 text-[10px] font-bold text-slate-950">
              {progress.level}
            </span>
          </div>

          <div className="hidden min-w-0 flex-col leading-tight sm:flex">
            <span className="truncate text-sm font-semibold text-slate-100">{player.displayName}</span>
            <span className="text-[11px] text-slate-500">{player.trainerId}</span>
          </div>

          <div className="hidden w-32 shrink-0 flex-col gap-0.5 sm:flex" title={remainingXpLabel}>
            <ExperienceBar current={progress.currentLevelXp} max={progress.xpRequiredForNextLevel} accent="#818cf8" />
            <span dir="ltr" className="text-[10px] text-slate-400">
              {progress.currentLevelXp} / {progress.xpRequiredForNextLevel} XP
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ResourcePill color="#facc15" label={player.coins.toLocaleString("he-IL")} title="מטבעות" />
          <ResourcePill color="#f59e0b" label={player.gold.toLocaleString("he-IL")} title="זהב" shape="diamond" />

          <NotificationBell initial={notifications} />
          <IconButton title="הגדרות">
            <GearIcon />
          </IconButton>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-white/10 bg-slate-900/70 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-white/20 hover:bg-slate-800 sm:px-3 sm:text-sm"
            >
              התנתק
            </button>
          </form>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:hidden" title={remainingXpLabel}>
        <div className="min-w-0 flex-1">
          <ExperienceBar current={progress.currentLevelXp} max={progress.xpRequiredForNextLevel} accent="#818cf8" />
        </div>
        <span dir="ltr" className="shrink-0 text-[10px] text-slate-400">
          {progress.currentLevelXp} / {progress.xpRequiredForNextLevel} XP
        </span>
      </div>
    </header>
  );
}

interface ResourcePillProps {
  color: string;
  label: string;
  title: string;
  shape?: "circle" | "diamond";
}

function ResourcePill({ color, label, title, shape = "circle" }: ResourcePillProps) {
  return (
    <div
      title={title}
      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/60 px-2 py-1 text-xs font-semibold text-slate-100 sm:px-2.5 sm:text-sm"
    >
      <span
        className={shape === "diamond" ? "h-2.5 w-2.5 rotate-45" : "h-2.5 w-2.5 rounded-full"}
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}aa` }}
      />
      {label}
    </div>
  );
}

function IconButton({ title, children }: { title: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 text-slate-300 transition-colors hover:border-white/20 hover:text-white sm:h-9 sm:w-9"
    >
      {children}
    </button>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 3v1.2M12 19.8V21M4.6 6.05l.9.9M18.5 17.05l.9.9M3 12h1.2M19.8 12H21M4.6 17.95l.9-.9M18.5 6.95l.9-.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
