"use client";

import { useState } from "react";

interface SpriteImageProps {
  src: string;
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
export function SpriteImage({ src, alt, className, fallbackClassName }: SpriteImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
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
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
