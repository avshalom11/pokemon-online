import type { BattleAttackSlot, BattleMenuAction } from "@/shared/types/battle-ui";

// Enemy renders slightly smaller / farther away, player slightly larger /
// closer, for basic depth perception. History: 0.85/1.15 -> 0.72/0.95 ->
// 0.63/0.83 -> this pass's 0.55/0.73, each a further visual-polish
// reduction (still felt too large against the new battle-platform
// artwork). This last step targeted a ~20-25% *visual-area* reduction
// (not just linear), i.e. new = old * sqrt(0.775) ~= old * 0.88 — since
// area shrinks with the square of a linear scale, a modest-looking linear
// drop reads as a noticeably bigger size change. Used as literal Tailwind
// scale-[...] classes at the call site (components/battle/PokemonSprite.tsx)
// — Tailwind can't resolve a dynamically-interpolated class name, only
// literal ones it can see in source, so this object is the documented
// source of truth and PokemonSprite's classes must be kept numerically in
// sync with it by hand. Nothing else needs to change to resize sprites
// further — no GIF assets are touched, only this transform-based scale.
export const SPRITE_SCALE = {
  enemy: 0.55,
  player: 0.73,
} as const;

// Whether the player's back sprite needs a horizontal mirror to face the
// wild Pokémon (who stands to its right). The real sprite art is already
// drawn facing right — unlike the placeholder silhouette this slot
// rendered before real art existed, which did need mirroring. Named and
// centralized here (rather than a bare boolean/ternary inline) so the
// *intent* — "should the player sprite be flipped" — stays documented in
// one place; components/battle/PokemonSprite.tsx's className must be kept
// in sync with this value the same way it already is with SPRITE_SCALE.
export const FLIP_PLAYER_SPRITE_HORIZONTALLY = false;

// Enemy status-card position — an arena-relative corner offset (the arena
// box excludes the footer's height, see BattleScene), unchanged from
// before this pass. The enemy card stays top-left, far from either
// platform's usual position, so it never needed the same fix as the
// player's card below.
export const ENEMY_HUD_POSITION_CLASS = "absolute left-3 top-3 sm:left-6 sm:top-6 lg:left-8 lg:top-8";

// Player status card's *horizontal* offset only — it stays on the right
// side (unchanged side), but its *vertical* position is intentionally NOT
// an arena-relative offset like the enemy's. Both HUD cards live on the
// right/upper-right side of the scene, the same general area every zone's
// wild-Pokémon platform sits in (see each theme's arena.wildPlatform in
// battleThemes.ts, all in the 34-49% range) — an arena-box corner offset
// couldn't push the card far enough down to clear it in every zone without
// also drifting into the footer. PLAYER_HUD_TOP_PERCENT instead positions
// it in the *same full-scene percentage coordinate space* the sprites use
// (see PlatformAnchor in BattleScene.tsx), decoupling it entirely from
// both the wild platform's Y and the footer's height.
export const PLAYER_HUD_SIDE_CLASS = "absolute right-3 sm:right-6 lg:right-8";

// 50%: clears every zone's wild platform (max 49%, grassland) while still
// leaving enough room below the card itself before the footer begins.
export const PLAYER_HUD_TOP_PERCENT = 50;

// Battle message box sizing — deliberately narrower than the footer's full
// width, rather than stretching edge-to-edge, so it can never reach under
// the player's status card: that card is pinned to the right edge at every
// breakpoint (PLAYER_HUD_SIDE_CLASS above). A responsive width *percentage*
// (not a fixed px value) so it scales with the panel's own responsive width
// (BattleWindow's --panel-width-pct), with a max-width cap so it never
// becomes uncomfortably wide on a large panel. ~60% on desktop, per the
// design target; wider on mobile/tablet since those panels are already
// narrow and a one-sentence message still needs room to breathe.
// Centralized here (rather than left as inline classes on
// BattleMessageBox) since this is a battle *layout* concern, same as every
// other constant in this file.
//
// self-start (not centered): the footer below (BattleScene) is a flex-col
// container, and the Attack Panel / Action Menu split into left/right
// halves at sm: and up (`sm:flex-row`, each `sm:flex-1`) — anchoring the
// message box to that same container's start (left) edge via align-self
// means it sits mostly over the Attack Panel's column rather than spanning
// the full footer width, putting it structurally far from the
// right-anchored player status card rather than merely nudged away from
// it. This replaced an earlier centered (mx-auto) + small transform-offset
// approach: self-start is the footer's own existing flex alignment
// mechanism, so reaching for it instead of a bigger arbitrary offset avoids
// adding another magic number on top of an already-centralized value.
export const MESSAGE_BOX_WIDTH_CLASS = "self-start w-[90%] sm:w-3/4 lg:w-3/5";
export const MESSAGE_BOX_MAX_WIDTH_CLASS = "max-w-sm sm:max-w-md lg:max-w-lg";

export const DEFAULT_BATTLE_MENU_ACTIONS: BattleMenuAction[] = [
  { id: "attack", label: "התקפה" },
  { id: "bag", label: "תיק" },
  { id: "monsters", label: "מפלצות" },
  { id: "run", label: "בריחה" },
];

export const DEFAULT_ATTACK_SLOTS: BattleAttackSlot[] = [
  { id: "attack-slot-1", name: "התקפה 1" },
  { id: "attack-slot-2", name: "התקפה 2" },
  { id: "attack-slot-3", name: "התקפה 3" },
  { id: "attack-slot-4", name: "התקפה 4" },
];
