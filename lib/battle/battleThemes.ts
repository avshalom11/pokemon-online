import type { BattleTheme } from "@/shared/types/battle-theme";
import type { ZoneId } from "@/shared/types/zone";

// Background image paths reference the files exactly as they should exist
// under public/battle-backgrounds/ (all lowercase .webp) — do not rename or
// convert these on disk; if a filename ever needs to change, change it here
// and on disk together.
export const GRASS_THEME: BattleTheme = {
  id: "grassland",
  name: "אזור הדשא",
  backgroundImage: "/battle-backgrounds/grass-battle.webp",
  colors: {
    panelAccent: "#4ade80",
  },
  particles: [{ shape: "leaf", color: "#facc15", count: 6 }],
  lighting: {
    glowColor: "#d9f2d0",
    ambientOpacity: 0.12,
  },
};

export const WATER_THEME: BattleTheme = {
  id: "water",
  name: "אזור המים",
  backgroundImage: "/battle-backgrounds/water-battle.webp",
  colors: {
    panelAccent: "#38bdf8",
  },
  particles: [{ shape: "bubble", color: "#e0f2fe", count: 8 }],
  lighting: {
    glowColor: "#7dd3fc",
    ambientOpacity: 0.16,
  },
};

export const CAVE_THEME: BattleTheme = {
  id: "cave",
  name: "אזור המערה",
  backgroundImage: "/battle-backgrounds/cave-battle.webp",
  colors: {
    panelAccent: "#a78bfa",
  },
  particles: [{ shape: "spore", color: "#c4b5fd", count: 5 }],
  lighting: {
    glowColor: "#a78bfa",
    ambientOpacity: 0.14,
  },
};

export const LAVA_THEME: BattleTheme = {
  id: "lava",
  name: "אזור הלבה",
  backgroundImage: "/battle-backgrounds/lava-battle.webp",
  colors: {
    panelAccent: "#f97316",
  },
  particles: [{ shape: "ember", color: "#fb923c", count: 10 }],
  lighting: {
    glowColor: "#f97316",
    ambientOpacity: 0.2,
  },
};

export const BEACH_THEME: BattleTheme = {
  id: "beach",
  name: "אזור החוף",
  backgroundImage: "/battle-backgrounds/beach-battle.webp",
  colors: {
    panelAccent: "#14b8a6",
  },
  particles: [{ shape: "spark", color: "#fef9c3", count: 6 }],
  lighting: {
    glowColor: "#fef08a",
    ambientOpacity: 0.14,
  },
};

// TODO(user-provided asset): this background contains recognizable
// Pokémon characters (Gengar and other Ghost-type silhouettes) — the user
// has explicitly accepted this as a temporary placeholder despite the
// project's stated original-IP direction. Replace before any public
// release; see conversation history for context.
export const GHOST_THEME: BattleTheme = {
  id: "haunted-house",
  name: "בית הרוחות",
  backgroundImage: "/battle-backgrounds/ghosthouse-battle.webp",
  colors: {
    panelAccent: "#93c5fd",
  },
  particles: [{ shape: "wisp", color: "#93c5fd", count: 5 }],
  // Lower than other themes deliberately: BattleBackground's shared ambient
  // tint uses mix-blend-mode "overlay", which darkens already-dark regions
  // further (multiply-like behavior below ~50% grey). This background is a
  // very dark night interior almost everywhere except a few lit windows, so
  // the usual opacity compounded into near-total blackness — tuned down
  // here rather than touching the shared blend mode in BattleBackground.
  lighting: {
    glowColor: "#93c5fd",
    ambientOpacity: 0.05,
  },
};

// One entry per zone. BattleScene and BattleBackground never change when a
// new theme is added here — only this registry grows.
export const BATTLE_THEMES: Partial<Record<ZoneId, BattleTheme>> = {
  grassland: GRASS_THEME,
  water: WATER_THEME,
  cave: CAVE_THEME,
  lava: LAVA_THEME,
  beach: BEACH_THEME,
  "haunted-house": GHOST_THEME,
};

export function getBattleTheme(zoneId?: ZoneId | null): BattleTheme {
  if (zoneId && BATTLE_THEMES[zoneId]) {
    return BATTLE_THEMES[zoneId];
  }

  return GRASS_THEME;
}
