import type { ReactNode } from "react";

import { ExperienceBar } from "@/components/battle/ExperienceBar";
import { logoutAction } from "@/lib/auth/actions";
import type { HomeViewData } from "@/features/home/services/home-data.service";

interface HomeHeaderProps {
  player: Pick<HomeViewData, "displayName" | "trainerId" | "level" | "xp" | "coins" | "gems">;
}

// The home-specific top bar. Deliberately not a change to the shared
// components/layout/GameHeader.tsx (kept minimal there so Map/Battle stay
// visually untouched) — this fills the same --app-header-height slot
// GameHeader already reserves, but only on /home, with the full resource
// bar the home screen actually needs.
export function HomeHeader({ player }: HomeHeaderProps) {
  const avatarInitial = player.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <header
      dir="rtl"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-3 backdrop-blur-md sm:px-6"
      style={{ height: "var(--app-header-height)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-[0_0_12px_rgba(129,90,238,0.55)] sm:h-11 sm:w-11">
          {avatarInitial}
          <span className="absolute -bottom-1 -left-1 rounded-full border border-slate-950 bg-indigo-400 px-1.5 py-0 text-[10px] font-bold text-slate-950">
            {player.level}
          </span>
        </div>

        <div className="hidden min-w-0 flex-col leading-tight sm:flex">
          <span className="truncate text-sm font-semibold text-slate-100">{player.displayName}</span>
          <span className="text-[11px] text-slate-500">{player.trainerId}</span>
        </div>

        <div className="hidden w-28 md:block">
          <ExperienceBar current={player.xp.current} max={player.xp.max} accent="#818cf8" />
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <ResourcePill color="#facc15" label={player.coins.toLocaleString("he-IL")} title="מטבעות" />
        <ResourcePill color="#c084fc" label={player.gems.toLocaleString("he-IL")} title="גבישים" shape="diamond" />

        <IconButton title="התראות">
          <BellIcon />
        </IconButton>
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

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path d="M18 16v-5a6 6 0 1 0-12 0v5l-1.5 2.5h15L18 16Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 21a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
