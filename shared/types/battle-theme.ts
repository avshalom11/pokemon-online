import type { ZoneId } from "./zone";

export type BattleParticleShape =
  | "leaf"
  | "bubble"
  | "ember"
  | "spore"
  | "spark"
  | "wisp";

export interface BattleThemeParticle {
  shape: BattleParticleShape;
  color: string;
  count: number;
}

export interface BattleThemeColors {
  /** UI accent color for this location's HUD/menu glow and highlights. */
  panelAccent: string;
}

export interface BattleThemeLighting {
  glowColor: string;
  ambientOpacity: number;
}

// A point on the battle artwork, as a percentage of the full background
// image (0-100 on both axes) — e.g. 32/68 means 32% in from the left edge,
// 68% down from the top. Used to anchor a standing Pokémon's feet to the
// center of that location's battle-platform circle in the art. Percentages
// (not pixels) so the anchor stays correct at any panel size.
export interface BattleArenaPoint {
  xPercent: number;
  yPercent: number;
}

export interface BattleThemeArena {
  /** Where the wild Pokémon's platform circle sits in this background. */
  wildPlatform: BattleArenaPoint;
  /** Where the player's platform circle sits in this background. */
  playerPlatform: BattleArenaPoint;
}

// GYM BATTLE BACKGROUNDS (later task) — Gym/Regional Champion battles are
// never a Field Battle zone (no wild encounter, no ZoneId of their own —
// see gym-battle-view.service.ts's own battleSource), so BattleTheme.id
// accepts these two additional, non-zone ids alongside every real ZoneId.
// Never read by BattleScene/BattleBackground themselves (grep-confirmed —
// this field exists purely for the theme object's own identity/debugging),
// so widening it here needed no change to either of those files.
export type GymBattleThemeId = "gym" | "gym-leader";

export interface BattleTheme {
  id: ZoneId | GymBattleThemeId;
  name: string;
  /** Path under /public to this location's battle background image. */
  backgroundImage: string;
  /** Where each combatant stands in this specific piece of art — see
   * BattleThemeArena. Every source image shares the same two-platform
   * composition (see the real art under public/battle-backgrounds/), so
   * these values are close across zones but tuned individually per image
   * rather than forced to one shared constant — this is the "clean
   * configuration object" the positioning math (components/battle/
   * BattleScene.tsx) reads from instead of any per-zone component code. */
  arena: BattleThemeArena;
  colors: BattleThemeColors;
  particles: BattleThemeParticle[];
  lighting: BattleThemeLighting;
}
