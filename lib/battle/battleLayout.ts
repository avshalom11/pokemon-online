import type { BattleAttackSlot, BattleMenuAction } from "@/shared/types/battle-ui";

// Enemy renders slightly smaller / farther away, player slightly larger /
// closer, for basic depth perception. Used as literal Tailwind scale-[...]
// classes at the call site (Tailwind can't resolve dynamic class names), so
// keep these two files in sync if the values ever change.
export const SPRITE_SCALE = {
  enemy: 0.85,
  player: 1.15,
} as const;

export const DEFAULT_BATTLE_MENU_ACTIONS: BattleMenuAction[] = [
  { id: "attack", label: "התקפה" },
  { id: "bag", label: "תיק" },
  { id: "monsters", label: "מפלצות" },
  { id: "run", label: "בריחה" },
];

// Placeholder attack/move slots for the Attack Panel. No real Move data
// flows in yet — that's a future engine-wiring pass — but the shape
// (id + display name) already matches what real moves will need.
export const DEFAULT_ATTACK_SLOTS: BattleAttackSlot[] = [
  { id: "attack-slot-1", name: "התקפה 1" },
  { id: "attack-slot-2", name: "התקפה 2" },
  { id: "attack-slot-3", name: "התקפה 3" },
  { id: "attack-slot-4", name: "התקפה 4" },
];
