"use client";

import { useState } from "react";

interface SpriteImageProps {
  src: string;
  // Tried once if `src` fails to load, before falling back to the
  // placeholder box below (e.g. a species' front sprite as a stand-in for
  // a not-yet-added back sprite — see components/battle/PokemonSprite.tsx).
  // Omit for the original single-source behavior.
  fallbackSrc?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

// Generic fallback-aware image renderer for any game sprite — static PNG/WEBP
// artwork, animated GIFs, future sprite sheets. Plain <img> rather than
// next/image: it must render whatever format is dropped in unmodified
// (animated GIFs in particular can't go through Next's image optimizer) and
// needs an onError hook, which next/image doesn't expose. Used wherever an
// asset may not exist yet (onboarding starter art today; map/battle sprites
// later) — swaps to a placeholder instead of a broken-image icon.
export function SpriteImage({ src, fallbackSrc, alt, className, fallbackClassName }: SpriteImageProps) {
  const [stage, setStage] = useState<"primary" | "fallback" | "broken">("primary");

  // Reset when the requested source changes (e.g. this instance gets reused
  // for a different Pokémon) so a previous failure doesn't stick around.
  // Adjusting state during render (React's documented pattern for this —
  // https://react.dev/learn/you-might-not-need-an-effect) rather than in a
  // useEffect, which would cause an extra cascading render.
  const [trackedSrc, setTrackedSrc] = useState({ src, fallbackSrc });

  if (trackedSrc.src !== src || trackedSrc.fallbackSrc !== fallbackSrc) {
    setTrackedSrc({ src, fallbackSrc });
    setStage("primary");
  }

  const currentSrc = stage === "primary" ? src : stage === "fallback" ? fallbackSrc : undefined;

  if (stage === "broken" || !currentSrc) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={
          fallbackClassName ??
          `flex items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 ${className ?? ""}`
        }
      >
        <span className="text-xs">אין תמונה</span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => setStage(stage === "primary" && fallbackSrc ? "fallback" : "broken")}
    />
  );
}
