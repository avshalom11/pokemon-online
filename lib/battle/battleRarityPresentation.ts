import { POKEMON_RARITY_LABELS } from "@/shared/types/pokemon-labels";
import type { PokemonRarity } from "@/shared/types/pokemon";

export interface RarityWarning {
  title: string;
  message: string;
  /** Self-contained styling (background/border/text/shadow) — never relies
   * on whatever it's rendered on top of, since it can sit on either the
   * default dark backdrop or a rarity-tinted one. */
  className: string;
}

export interface RarityPresentation {
  /** Hebrew label rendered next to the Pokémon's name, e.g. "נדיר מאוד" —
   * reused from the existing POKEMON_RARITY_LABELS map (features/pokemon
   * already renders these same strings for type/rarity badges), never
   * redefined here. */
  label: string;
  /** Replaces BattleWindow's default bg-slate-950 outer backdrop. */
  windowBackgroundClass: string;
  /** Translucent wash layered over the battle scene's own artwork
   * (components/battle/BattleBackground.tsx), covering the full panel —
   * not just the HUD name card. Empty string renders no overlay at all. */
  sceneOverlayClassName: string;
  /** Present only for very-rare/legendary — absent (undefined) is what
   * tells the warning banner not to render for common/rare. */
  warning?: RarityWarning;
}

// One entry per PokemonRarity value (shared/types/pokemon.ts) — a Record
// keyed by the full union, so adding a rarity to that type is a compile
// error here until it's given a presentation, the same safety
// data/battle/capture-rate-config.ts's own CAPTURE_RATE_TABLE already
// relies on. common/rare intentionally keep the game's existing look untouched;
// only very-rare/legendary get a distinct background + warning banner.
export const RARITY_PRESENTATION: Record<PokemonRarity, RarityPresentation> = {
  common: {
    label: POKEMON_RARITY_LABELS.common,
    windowBackgroundClass: "bg-slate-950",
    sceneOverlayClassName: "",
  },
  rare: {
    label: POKEMON_RARITY_LABELS.rare,
    windowBackgroundClass: "bg-slate-950",
    sceneOverlayClassName: "",
  },
  "very-rare": {
    label: POKEMON_RARITY_LABELS["very-rare"],
    windowBackgroundClass: "bg-red-950",
    sceneOverlayClassName: "absolute inset-0 bg-red-950/55",
    warning: {
      title: "שים לב — פגשת פוקימון נדיר מאוד!",
      message: "זהו פוקימון נדיר במיוחד. זו הזדמנות מצוינת לנסות לתפוס אותו.",
      className:
        "border-2 border-red-500/70 bg-red-950/90 text-red-50 shadow-[0_0_25px_-6px_rgba(220,38,38,0.65)]",
    },
  },
  legendary: {
    label: POKEMON_RARITY_LABELS.legendary,
    windowBackgroundClass: "bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500",
    sceneOverlayClassName: "absolute inset-0 bg-amber-400/40",
    warning: {
      title: "שים לב — פגשת פוקימון אגדי!",
      message: "מפגש כזה נדיר ביותר — מומלץ מאוד לנסות לתפוס אותו.",
      className:
        "border-2 border-amber-300 bg-gradient-to-b from-yellow-300 to-amber-400 text-amber-950 shadow-[0_0_30px_-4px_rgba(251,191,36,0.85)]",
    },
  },
};

export function getRarityPresentation(rarity: PokemonRarity): RarityPresentation {
  return RARITY_PRESENTATION[rarity];
}
