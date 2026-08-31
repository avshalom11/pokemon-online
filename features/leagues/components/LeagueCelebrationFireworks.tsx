"use client";

import { useEffect, useRef, useState } from "react";

interface LeagueCelebrationFireworksProps {
  // 1st place reads slightly more impressive (more particles, faster/more
  // concurrent bursts) — a single shared implementation parameterized by
  // this one flag, never three separate fireworks systems (see this
  // component's own doc comment below).
  intense: boolean;
}

interface FireworkParticle {
  dx: string;
  dy: string;
  color: string;
  delay: string;
  duration: string;
}

interface FireworkBurst {
  id: number;
  left: string;
  top: string;
  particles: FireworkParticle[];
}

const FIREWORK_COLORS = ["#fbbf24", "#f472b6", "#38bdf8", "#34d399", "#a78bfa", "#fb7185", "#facc15"];
// Each burst is auto-removed from the DOM this long after it's created —
// must be >= the longest possible individual particle animation-duration
// below (0.9s + 0.5s jitter = 1.4s max) plus its delay (0.15s max), so a
// burst is never yanked out mid-animation.
const BURST_LIFETIME_MS = 1700;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Bursts are biased toward the outer thirds of the screen — the modal card
// itself sits centered in front of this layer (see
// LeaguePlacementCelebrationModal.tsx), so a burst spawned directly behind
// it would mostly just be occluded; keeping bursts nearer the edges makes
// them visibly "launch around the background" instead.
function randomEdgeBiasedPercent(): number {
  return Math.random() < 0.5 ? randomBetween(2, 32) : randomBetween(68, 98);
}

function createBurst(id: number, particleCount: number): FireworkBurst {
  const left = `${randomEdgeBiasedPercent()}%`;
  const top = `${randomBetween(8, 62)}%`;

  const particles: FireworkParticle[] = Array.from({ length: particleCount }, (_, index) => {
    const angle = (index / particleCount) * Math.PI * 2 + randomBetween(-0.2, 0.2);
    const distance = randomBetween(38, 92);
    return {
      dx: `${Math.cos(angle) * distance}px`,
      dy: `${Math.sin(angle) * distance}px`,
      color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]!,
      delay: `${randomBetween(0, 0.12)}s`,
      duration: `${randomBetween(0.9, 1.4)}s`,
    };
  });

  return { id, left, top, particles };
}

// LEAGUE PLACEMENT CELEBRATION — ANIMATED FIREWORKS. Pure CSS-transform/
// opacity particle bursts (league-firework-particle, app/globals.css —
// same "component renders positions/colors, CSS keyframes do the actual
// motion" split components/battle/BattleParticles.tsx already establishes
// for this project's other ambient particle effects), so animation itself
// never causes a React re-render on every frame — React only re-renders
// when a burst is ADDED or REMOVED (a few times over the modal's open
// lifetime), never per-frame.
//
// LIFECYCLE — mounted fresh every time a NEW celebration becomes active
// (LeaguePlacementCelebrationModal is remounted via a `key={tournamentId}`
// prop one level up in LeaguesContent.tsx), so this component's own mount
// effect below is already "start fresh per celebration" for free; its
// cleanup (unmount, or `intense` changing) clears every pending timeout and
// empties the burst list — no lingering timers, no leaked state, and
// nothing keeps running once the modal itself unmounts (no active
// celebration left).
//
// REDUCED MOTION — a continuous, ever-repeating burst cycle is exactly the
// kind of animation prefers-reduced-motion exists for; when it's set, this
// renders nothing at all rather than a toned-down version, and the modal
// itself (award image, rewards, אישור button) is completely unaffected
// either way — this component is purely decorative and never gates
// anything.
export function LeagueCelebrationFireworks({ intense }: LeagueCelebrationFireworksProps) {
  const [bursts, setBursts] = useState<FireworkBurst[]>([]);
  const nextBurstIdRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const particleCount = intense ? 16 : 11;
    const maxConcurrentBursts = intense ? 5 : 3;
    const minIntervalMs = intense ? 550 : 850;
    const maxIntervalMs = intense ? 1050 : 1650;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function spawnBurst() {
      const burst = createBurst(nextBurstIdRef.current++, particleCount);
      setBursts((current) => {
        const next = [...current, burst];
        return next.length > maxConcurrentBursts ? next.slice(next.length - maxConcurrentBursts) : next;
      });

      timeouts.push(
        setTimeout(() => {
          setBursts((current) => current.filter((existing) => existing.id !== burst.id));
        }, BURST_LIFETIME_MS)
      );

      timeouts.push(setTimeout(spawnBurst, randomBetween(minIntervalMs, maxIntervalMs)));
    }

    // A second, slightly staggered burst right at the start so the
    // celebration feels alive immediately rather than opening on one lone
    // explosion.
    spawnBurst();
    timeouts.push(setTimeout(spawnBurst, 220));

    return () => {
      for (const timeout of timeouts) clearTimeout(timeout);
      setBursts([]);
    };
  }, [intense]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {bursts.map((burst) => (
        <div key={burst.id} className="absolute" style={{ left: burst.left, top: burst.top }}>
          {burst.particles.map((particle, index) => (
            <span
              key={index}
              className="animate-league-firework-particle absolute block h-1.5 w-1.5 rounded-full"
              style={
                {
                  backgroundColor: particle.color,
                  boxShadow: `0 0 6px 2px ${particle.color}99`,
                  animationDelay: particle.delay,
                  animationDuration: particle.duration,
                  "--firework-dx": particle.dx,
                  "--firework-dy": particle.dy,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}
