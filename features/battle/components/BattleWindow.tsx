"use client";

import type { CSSProperties, ReactNode } from "react";

import { useBattleMusic } from "@/features/battle/utils/battle-music";

interface BattleWindowProps {
  children: ReactNode;
  /** Replaces the default `bg-slate-950` outer backdrop — see
   * lib/battle/battleRarityPresentation.ts's `windowBackgroundClass`.
   * Omitted keeps today's look exactly as-is. */
  backgroundClassName?: string;
  /** Rendered above the game panel, inside the same centered column —
   * e.g. RarityWarningBanner (components/battle/RarityWarningBanner.tsx).
   * Omitted (the common/rare case) reserves no extra space, so the panel's
   * position is unchanged from before this prop existed. */
  banner?: ReactNode;
  /** BATTLE BACKGROUND MUSIC (later task) — set to false while a victory/
   * defeat result overlay is showing on top of an otherwise still-mounted
   * BattleWindow (e.g. Field Battle's captured/partyDefeated overlay,
   * Gym's defeat overlay) — the music pauses without needing this whole
   * component to unmount. Omitted (the common case, still actively
   * fighting) plays/keeps playing, looped, at a low background volume —
   * see useBattleMusic. A battle screen that unmounts BattleWindow
   * entirely for its result (Gym's own victory branch, League PvP's
   * completed screen) already stops the music via this hook's own cleanup,
   * with no need to ever pass this prop. */
  musicActive?: boolean;
  /** FIELD BATTLE MUSIC (later task) — which track useBattleMusic plays,
   * forwarded straight through unmodified. Omitted (Gym/Regional
   * Champion/League PvP — the common case) keeps the existing shared
   * battle-theme.mp3 exactly as before this prop existed; Field Battle is
   * the only caller that passes FIELD_BATTLE_MUSIC_PATH
   * (features/battle/utils/battle-music.ts). The playback mechanism itself
   * is unaffected either way — only which file useBattleMusic loads. */
  musicTrack?: string;
}

// The battle screen's own page shell — deliberately not the shared
// components/layout/GameScreen.tsx (which Map/Home/My Pokémon use, and
// fills nearly the full viewport). The new battle artwork is meant to read
// as a premium, centered game window floating over the app's usual dark
// backdrop rather than a full-bleed page, so Battle gets its own shell
// instead of stretching GameScreen's contract to fit — this file has no
// effect on any other page.
//
// The panel's width is `min(<responsive width %>, <available height> * 1.5,
// 1400px)` rather than a plain width percentage. That's deliberate: with
// just a width % + `aspect-ratio: 3/2` + a `max-height` safety cap (the
// first version of this), a short/wide browser window hits the max-height
// cap *without* the width shrinking to match — the panel's *effective*
// rendered aspect ratio drifts wider than 3:2, and since the artwork
// (object-fit: cover) is exactly 3:2, that drift shows up as extra,
// unwanted crop on a very common desktop window shape. Using `min()` for
// the width itself means whichever budget is tighter (viewport width vs.
// viewport height) is the one that actually constrains the panel, and the
// *other* dimension is always derived from aspect-ratio — so the panel is
// always exactly 3:2, at whatever size fits, and the background never
// needs to crop more than the sliver `cover` unavoidably trims.
//
// --panel-width-pct / --panel-reserved-height are set responsively via
// Tailwind's arbitrary-property classes below (92%/sm:85%/lg:75% and a
// matching reserved-vertical-space figure that tracks this component's own
// padding at each breakpoint) — deliberately NOT duplicated into the
// inline `style` below, since an inline value would always win over the
// responsive classes and silently break them at every breakpoint.
const PANEL_STYLE: CSSProperties = {
  width: "min(var(--panel-width-pct), calc((100dvh - var(--panel-reserved-height)) * 1.5), 1400px)",
  aspectRatio: "3 / 2",
};

export function BattleWindow({ children, backgroundClassName, banner, musicActive = true, musicTrack }: BattleWindowProps) {
  useBattleMusic(musicActive, musicTrack);

  return (
    <div
      className={`relative flex min-h-dvh items-center justify-center overflow-hidden px-4 pb-4 pt-[calc(var(--app-header-height)+1rem)] sm:px-8 sm:pb-8 sm:pt-[calc(var(--app-header-height)+2rem)] ${backgroundClassName ?? "bg-slate-950"}`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(129,90,238,0.14), transparent 60%)",
        }}
      />

      {/* Single flex item of the row above, so it's centered exactly like
          the panel alone used to be. banner is undefined for common/rare
          (the vast majority of encounters), which renders this identically
          to before — no reserved space, no layout shift. */}
      <div className="relative flex w-full flex-col items-center gap-3">
        {banner}

        <div
          className="relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 [--panel-reserved-height:calc(var(--app-header-height)+32px)] [--panel-width-pct:92%] sm:[--panel-reserved-height:calc(var(--app-header-height)+64px)] sm:[--panel-width-pct:85%] lg:[--panel-width-pct:75%]"
          style={PANEL_STYLE}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
