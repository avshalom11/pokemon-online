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

export interface BattleTheme {
  id: ZoneId;
  name: string;
  /** Path under /public to this location's battle background image. */
  backgroundImage: string;
  colors: BattleThemeColors;
  particles: BattleThemeParticle[];
  lighting: BattleThemeLighting;
}
