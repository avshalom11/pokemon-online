import Image from "next/image";

import { BattleParticles } from "./BattleParticles";
import type { BattleTheme } from "@/shared/types/battle-theme";

interface BattleBackgroundProps {
  theme: BattleTheme;
  /** Full pre-built className (incl. `absolute inset-0`) for a translucent
   * rarity wash layered above the vignette — see
   * lib/battle/battleRarityPresentation.ts. Omitted/empty renders nothing,
   * so a common/rare encounter looks exactly as before. Orthogonal to
   * `theme`: this tints whichever zone artwork is already showing, it
   * never replaces it. */
  rarityOverlayClassName?: string;
}

// Every battle location renders through this one component — the location
// itself is just data (theme.backgroundImage / colors / particles /
// lighting / arena). Adding a 7th zone means a new theme object in
// lib/battle/battleThemes.ts, nothing here.
//
// Plain object-fit: cover is enough here (no oversize/zoom trick needed):
// the game panel this renders inside (features/battle/components/
// BattleWindow.tsx) is deliberately locked to this artwork's own aspect
// ratio (3:2, matching every background image exactly), so cover only ever
// needs to crop a sliver at most, at native resolution — sharp, full
// artwork, no meaningful zoom. That's only true because the panel's shape
// is controlled; a full-viewport-width/height container (this component's
// previous context) could be a very different shape from the art, which is
// what previously required a more elaborate fit.
export function BattleBackground({ theme, rarityOverlayClassName }: BattleBackgroundProps) {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <Image
        src={theme.backgroundImage}
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 75vw, (min-width: 640px) 85vw, 92vw"
        className="object-cover"
      />

      {/* Shared ambient light tint and particles — every theme gets these
          for free; only their color/opacity/shape (theme.lighting /
          theme.particles) varies. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: theme.lighting.glowColor,
          opacity: theme.lighting.ambientOpacity,
          mixBlendMode: "overlay",
        }}
      />

      {/* Cinematic vignette for depth, shared across every theme. */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 60%, rgba(0,0,0,0.3) 100%)",
        }}
      />

      {/* Rarity wash (very-rare/legendary only) — covers the whole scene,
          on top of the zone artwork/tint/vignette above, still beneath the
          sprites/HUDs rendered by BattleScene outside this component. */}
      {rarityOverlayClassName ? <div className={rarityOverlayClassName} /> : null}

      <BattleParticles particles={theme.particles} />
    </div>
  );
}
