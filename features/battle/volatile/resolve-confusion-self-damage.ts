import { calculateBaseDamage } from "@/engine/damage";

// Phase 7 — confusion self-hit damage. Reuses the exact same shared
// calculateBaseDamage the Damage Engine's own calculateMoveDamage is built
// on (never a second/duplicated formula) — a canonical, simple typeless
// physical hit against the confused Pokémon's OWN Attack and Defense (no
// STAB, no type effectiveness, never critical, since real confusion
// self-hits never crit either). Power 40 is the standard confusion
// self-hit power every mainline generation uses. Deliberately NOT modeled
// as a real Move Registry entry — see this project's move engine's own
// documented rule against fabricating moves that were never real data.
const CONFUSION_SELF_HIT_POWER = 40;
const MIN_SELF_DAMAGE = 1;

export function resolveConfusionSelfDamage(level: number, attack: number, defense: number, randomFactor: number): number {
  const base = calculateBaseDamage(level, CONFUSION_SELF_HIT_POWER, attack, defense);
  return Math.max(MIN_SELF_DAMAGE, Math.floor(base * randomFactor));
}
