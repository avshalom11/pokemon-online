import Image from "next/image";

import { BattleParticles } from "./BattleParticles";
import type { BattleTheme } from "@/shared/types/battle-theme";

interface BattleBackgroundProps {
  theme: BattleTheme;
}

// Every battle location renders through this one component — the location
// itself is just data (theme.backgroundImage / colors / particles /
// lighting). Adding a 7th zone means a new theme object in
// lib/battle/battleThemes.ts, nothing here.
export function BattleBackground({ theme }: BattleBackgroundProps) {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <Image
        src={theme.backgroundImage}
        alt=""
        fill
        priority
        sizes="100vw"
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

      <BattleParticles particles={theme.particles} />
    </div>
  );
}
