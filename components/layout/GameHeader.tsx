"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { ExperienceBar } from "@/components/battle/ExperienceBar";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import { CurrencyInfoDialog } from "@/features/currency/components/CurrencyInfoDialog";
import type { CurrencyType } from "@/features/currency/types/currency.types";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { SoundToggle } from "@/components/layout/SoundToggle";
import type { NotificationBellData } from "@/features/notifications/types";
import { useDailyBattleCount } from "@/features/player/context/daily-battle-count-context";
import { usePlayerProgression } from "@/features/player/context/player-progression-context";
import type { PlayerHeaderData } from "@/features/player/services/player-header-data.service";
import { PlayerProfileLink } from "@/features/profile/components/PlayerProfileLink";
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
  // without a refresh, while displayName/username/regionLabel/coins/gold
  // (rarely change mid-session) still come directly from the
  // server-rendered prop.
  const { progress } = usePlayerProgression();
  const { count: dailyBattleCount } = useDailyBattleCount();
  const avatarInitial = player.displayName.trim().charAt(0).toUpperCase() || "?";
  const remainingXp = progress.xpRequiredForNextLevel - progress.currentLevelXp;
  const remainingXpLabel = `נותרו ${remainingXp} XP לרמה הבאה`;

  // CURRENCY INFO — which currency's info dialog (if any) is open. Null
  // whenever closed; only ever "money" or "gold" while open — never both
  // at once (opening one always replaces the other, same single-slot
  // pattern every other one-at-a-time dialog in this header area uses).
  const [openCurrencyInfo, setOpenCurrencyInfo] = useState<CurrencyType | null>(null);

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
            <PlayerProfileLink
              username={player.username}
              className="truncate text-sm font-semibold text-slate-100 hover:underline"
            >
              {player.displayName}
            </PlayerProfileLink>
            <span className="text-[11px] text-slate-500">{player.regionLabel}</span>
          </div>

          <div className="hidden w-32 shrink-0 flex-col gap-0.5 sm:flex" title={remainingXpLabel}>
            <ExperienceBar current={progress.currentLevelXp} max={progress.xpRequiredForNextLevel} accent="#818cf8" />
            <span dir="ltr" className="text-[10px] text-slate-400">
              {progress.currentLevelXp} / {progress.xpRequiredForNextLevel} XP
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ResourcePill
            icon={<span aria-hidden="true">⚔️</span>}
            label={`קרבות היום: ${dailyBattleCount}`}
            title="קרבות היום"
          />
          <ResourcePill
            icon={<CurrencyIcon type="money" />}
            label={player.coins.toLocaleString("he-IL")}
            title="מטבעות — לחצו למידע"
            onClick={() => setOpenCurrencyInfo("money")}
          />
          <ResourcePill
            icon={<CurrencyIcon type="gold" />}
            label={player.gold.toLocaleString("he-IL")}
            title="זהב — לחצו למידע"
            onClick={() => setOpenCurrencyInfo("gold")}
          />

          <SoundToggle />

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

      {/* CURRENCY INFO — CENTER ON SCREEN. Rendered through a portal into
          document.body rather than in place: this <header> carries
          backdrop-blur-md (a backdrop-filter), which — like `transform` —
          establishes a new containing block for any `position: fixed`
          descendant per the CSS spec. Left in place, the dialog's own
          `fixed inset-0` (CurrencyInfoDialog's existing, unchanged
          centering pattern) would resolve against THIS header's small
          fixed box instead of the viewport, pinning it near the top
          instead of centering it on screen. The portal is the only change
          — the dialog's markup, styling, and behavior are untouched. */}
      {openCurrencyInfo
        ? createPortal(
            <CurrencyInfoDialog type={openCurrencyInfo} onClose={() => setOpenCurrencyInfo(null)} />,
            document.body
          )
        : null}
    </header>
  );
}

interface ResourcePillProps {
  icon: ReactNode;
  label: string;
  title: string;
  // CURRENCY INFO — optional: only the Money/Gold pills pass this (opens
  // CurrencyInfoDialog); the daily-battle-count pill passes none and stays
  // a plain, non-interactive div exactly as before.
  onClick?: () => void;
}

// Icon-agnostic shell — both current callers pass a CurrencyIcon
// (features/currency/components/CurrencyIcon.tsx), which is what actually
// owns each currency's color/shape, so both pills stay visually
// consistent (same size, shape, spacing, glow) automatically rather than
// this component re-deriving that styling itself. Renders as a real
// <button> (same visual shell, same padding/border/text classes) only when
// `onClick` is given, so a pill with nothing to click never gains a
// misleading interactive affordance.
function ResourcePill({ icon, label, title, onClick }: ResourcePillProps) {
  const className =
    "flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/60 px-2 py-1 text-xs font-semibold text-slate-100 sm:px-2.5 sm:text-sm";

  if (onClick) {
    return (
      <button type="button" title={title} onClick={onClick} className={`${className} transition-colors hover:border-white/20 hover:bg-slate-800`}>
        {icon}
        {label}
      </button>
    );
  }

  return (
    <div title={title} className={className}>
      {icon}
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
