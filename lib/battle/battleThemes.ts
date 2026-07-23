import type { BattleTheme } from "@/shared/types/battle-theme";
import type { ZoneId } from "@/shared/types/zone";

// Background image paths reference the files exactly as they should exist
// under public/battle-backgrounds/ (all lowercase, currently .png — the
// high-quality artwork replaced the original .webp placeholders in place;
// keep this extension in sync with whatever's actually on disk) — do not
// rename or convert these on disk; if a filename ever needs to change,
// change it here and on disk together.
//
// Every image is the same 1536x1024 (3:2) canvas and shares the same
// two-circle composition: a larger platform in the lower-left foreground
// (the player's) and a smaller one in the upper-right background (the
// wild Pokémon's). Each theme's `arena` values below were read directly
// off that zone's own artwork rather than reused from a single shared
// constant, since the exact circle positions vary a little zone to zone —
// see BattleThemeArena's doc comment (shared/types/battle-theme.ts) and
// components/battle/BattleScene.tsx, which is the one place that turns
// these percentages into an actual Pokémon position; nothing here is
// zone-specific positioning *code*, only zone-specific positioning *data*.
export const GRASS_THEME: BattleTheme = {
  id: "grassland",
  name: "אזור הדשא",
  backgroundImage: "/battle-backgrounds/grass-battle.png",
  arena: {
    playerPlatform: { xPercent: 32, yPercent: 68 },
    wildPlatform: { xPercent: 75, yPercent: 49 },
  },
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
  backgroundImage: "/battle-backgrounds/water-battle.png",
  arena: {
    playerPlatform: { xPercent: 36, yPercent: 59 },
    wildPlatform: { xPercent: 75, yPercent: 34 },
  },
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
  backgroundImage: "/battle-backgrounds/cave-battle.png",
  arena: {
    playerPlatform: { xPercent: 31, yPercent: 58 },
    wildPlatform: { xPercent: 70, yPercent: 35 },
  },
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
  backgroundImage: "/battle-backgrounds/lava-battle.png",
  arena: {
    playerPlatform: { xPercent: 27, yPercent: 71 },
    wildPlatform: { xPercent: 76, yPercent: 48 },
  },
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
  backgroundImage: "/battle-backgrounds/beach-battle.png",
  arena: {
    playerPlatform: { xPercent: 35, yPercent: 66 },
    wildPlatform: { xPercent: 76, yPercent: 43 },
  },
  colors: {
    panelAccent: "#14b8a6",
  },
  particles: [{ shape: "spark", color: "#fef9c3", count: 6 }],
  lighting: {
    glowColor: "#fef08a",
    ambientOpacity: 0.14,
  },
};

export const GHOST_THEME: BattleTheme = {
  id: "haunted-house",
  name: "בית הרוחות",
  backgroundImage: "/battle-backgrounds/ghosthouse-battle.png",
  arena: {
    playerPlatform: { xPercent: 33, yPercent: 60 },
    wildPlatform: { xPercent: 76, yPercent: 41 },
  },
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
