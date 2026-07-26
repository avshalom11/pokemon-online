// Compile-time-only checks for the move engine's public types. This file is
// never imported or executed — `npx tsc --noEmit` is what exercises it, the
// same way move-schema.test.ts exercises the runtime validator. A broken
// type change should fail the build here before it fails anywhere else.
import type { Move, MoveEffect } from "./move.types.ts";

// A fully valid Move literal must type-check with no errors.
const validMove: Move = {
  id: "tackle",
  name: "Tackle",
  generation: 1,
  introducedGeneration: 1,
  description: "A physical attack in which the user charges and slams into the target.",
  type: "normal",
  category: "physical",
  power: 40,
  accuracy: 100,
  maxPp: 35,
  priority: 0,
  target: "opponent",
  effect: { kind: "damage" },
  flags: ["makesContact"],
  implementationStatus: "data-only",
};
void validMove;

// @ts-expect-error — category must be one of the three literal strings.
const invalidCategory: Move["category"] = "ultra";
void invalidCategory;

// @ts-expect-error — accuracy must be a number or null, never a string.
const invalidAccuracy: Move["accuracy"] = "always";
void invalidAccuracy;

// @ts-expect-error — a discriminated MoveEffect can't mix fields from two
// different kinds (chancePercent belongs to damage-with-status-chance, not
// plain damage).
const invalidEffect: MoveEffect = { kind: "damage", chancePercent: 10 };
void invalidEffect;

// Narrowing on `kind` must give each variant its own fields.
function describeEffect(effect: MoveEffect): string {
  switch (effect.kind) {
    case "damage-with-status-chance":
      // Only reachable here because the discriminant narrowed the union.
      return `${effect.status} at ${effect.chancePercent}%`;
    case "stat-change":
      return effect.changes.map((change) => `${change.stat} ${change.stages}`).join(", ");
    case "fixed-damage":
      return effect.damage.basis;
    default:
      return effect.kind;
  }
}
void describeEffect;

// @ts-expect-error — flags is a MoveFlag[], not an arbitrary string[].
const invalidFlags: Move["flags"] = ["not-a-real-flag"];
void invalidFlags;
