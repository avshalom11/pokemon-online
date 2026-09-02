"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// HOME FULL-SCREEN BACKGROUND — visual experiment, Home only. GameScreen's
// own inner "premium app" box (components/layout/GameScreen.tsx) caps
// content to w-[85%]/max-w-[1400px] and rounds/clips it — a bg-cover image
// set directly on HomeContent's own root therefore computes `cover` against
// THAT smaller box, not the real browser viewport, so it reads "framed/
// cropped differently" than AuthScreen's true full-viewport version rather
// than literally not showing. Portalled straight into document.body
// (bypassing every ancestor, GameScreen included) so this div's own box IS
// the real viewport — matching AuthScreen's approach
// (components/auth/AuthScreen.tsx) exactly — without touching
// GameScreen.tsx itself, so every other page's own use of GameScreen is
// completely unaffected.
//
// Z-INDEX FIX — this used to be -z-10 (matching GameScreen's own existing
// global background layer), which turned out to render fully invisible:
// per the CSS2.1 stacking order, a stacking context's OWN in-flow,
// non-positioned descendants (CSS2.1 Appendix E step 3 — e.g. GameScreen's
// outer div, which is a plain `flex h-dvh flex-col bg-slate-950 ...` box
// with no position/z-index of its own) paint ABOVE any negative-z-index
// positioned descendant of that same stacking context (step 2) —
// REGARDLESS of DOM nesting depth or portal placement. So GameScreen's own
// opaque bg-slate-950 (a plain, non-positioned box) was always painting
// over this -z-10 layer, portal or not. z-0 moves this into step 6
// (positioned descendants with an explicit, non-negative z-index), which
// ranks ABOVE step 3 — the image now actually renders. Home's own real
// content wrapper below has a matching explicit z-10 (see its own comment)
// so it stays above this z-0 background — GameHeader (z-50) and
// GameSidebar/GlobalChatBar (z-40/z-[45]) already have higher explicit
// z-indices of their own and are unaffected either way.
//
// The mounted-state guard is the standard SSR-safe portal pattern:
// createPortal needs `document`, which doesn't exist during server
// rendering — rendering null until the first client-side effect avoids a
// hydration mismatch, at the cost of one frame with no background on first
// paint (acceptable for this visual test).
//
// SIZING — bg-cover + bg-center + bg-no-repeat is already the correct/
// standard full-viewport-background recipe: `cover` always preserves the
// source image's own aspect ratio (crops the overflow, never stretches/
// distorts), `center` keeps the crop centered, and `no-repeat` is added
// here for correctness even though `cover` already leaves no gap for a
// single background to tile into. There's no better CSS technique for a
// full-bleed background than this. The remaining softness is the source
// file itself: public/images/auth/game-background.png is only 596×335px —
// on an 1920px-wide viewport `cover` has to upscale it ~3.2x, and that
// upscaling (not a CSS/rendering deficiency) is what reads as blur. Not
// fixed here per the ticket's own "do NOT artificially upscale/process the
// image file" — see this task's own report for the recommended replacement
// resolution.
//
// BRIGHTNESS — the 20% black darkening overlay tried here has been removed
// again: the image now renders at its own original 100% brightness, no
// opacity reduction, nothing layered on top of it. Positioning/scaling
// (bg-cover/bg-center/bg-no-repeat, fixed inset-0, z-0) is unchanged from
// before that overlay existed.
export function HomeFullScreenBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/auth/game-background.png')" }}
    />,
    document.body
  );
}
