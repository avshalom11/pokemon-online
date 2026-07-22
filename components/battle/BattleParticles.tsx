"use client";

import { useMemo } from "react";

import type { BattleThemeParticle } from "@/shared/types/battle-theme";

interface BattleParticlesProps {
  particles: BattleThemeParticle[];
}

type ParticleMotion = "fall" | "rise" | "twinkle";

// Renders theme-driven ambient particles (falling leaves, rising bubbles,
// drifting embers, ...). Adding a new shape for a future theme only needs a
// case in getParticleMotion and renderParticleShape below — BattleScene and
// BattleBackground never need to change.
export function BattleParticles({ particles }: BattleParticlesProps) {
  const instances = useMemo(
    () =>
      particles.flatMap((particle) =>
        Array.from({ length: particle.count }, (_, index) => ({
          key: `${particle.shape}-${index}`,
          shape: particle.shape,
          color: particle.color,
          left: `${(index * 37 + 5) % 100}%`,
          top: `${(index * 23 + 15) % 70}%`,
          delay: `${(index % 6) * 0.9}s`,
          duration: `${6 + (index % 4)}s`,
        }))
      ),
    [particles]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {instances.map((particle) => {
        const motion = getParticleMotion(particle.shape);
        const motionClassName =
          motion === "fall"
            ? "animate-battle-float absolute top-[-10%]"
            : motion === "rise"
              ? "animate-battle-rise absolute bottom-[-10%]"
              : "animate-battle-twinkle absolute";

        return (
          <span
            key={particle.key}
            className={motionClassName}
            style={{
              left: particle.left,
              top: motion === "twinkle" ? particle.top : undefined,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          >
            {renderParticleShape(particle.shape, particle.color)}
          </span>
        );
      })}
    </div>
  );
}

function getParticleMotion(shape: BattleThemeParticle["shape"]): ParticleMotion {
  switch (shape) {
    case "leaf":
      return "fall";
    case "bubble":
    case "ember":
    case "wisp":
      return "rise";
    case "spore":
      return "rise";
    case "spark":
      return "twinkle";
    default:
      return "fall";
  }
}

function renderParticleShape(shape: BattleThemeParticle["shape"], color: string) {
  switch (shape) {
    case "leaf":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <path d="M7 0 C12 3 12 11 7 14 C2 11 2 3 7 0 Z" fill={color} opacity={0.85} />
        </svg>
      );
    case "bubble":
      return (
        <span
          className="block rounded-full border"
          style={{ width: 10, height: 10, borderColor: `${color}aa`, backgroundColor: `${color}33` }}
        />
      );
    case "ember":
      return (
        <span
          className="block rounded-full"
          style={{ width: 6, height: 6, backgroundColor: color, boxShadow: `0 0 6px 2px ${color}99` }}
        />
      );
    case "spore":
      return (
        <span
          className="block rounded-full"
          style={{ width: 5, height: 5, backgroundColor: color, opacity: 0.6 }}
        />
      );
    case "wisp":
      return (
        <span
          className="block rounded-full"
          style={{ width: 12, height: 12, backgroundColor: `${color}55`, boxShadow: `0 0 10px 4px ${color}55` }}
        />
      );
    case "spark":
      return (
        <span
          className="block rounded-full"
          style={{ width: 4, height: 4, backgroundColor: color, boxShadow: `0 0 5px 1px ${color}aa` }}
        />
      );
    default:
      return <span className="block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />;
  }
}
