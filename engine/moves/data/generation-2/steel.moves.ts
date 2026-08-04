// Steel-type moves introduced in Generation 2 — the first Steel-type move
// data in this project (Steel was a new playable type as of Generation 2).
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_STEEL_MOVES: Move[] = [
  {
    id: "metal-claw",
    name: "Metal Claw",
    generation: 2,
    introducedGeneration: 2,
    description:
      "A steel-clawed swipe. Has a 10% chance to raise the user's own Attack in the original games; simplified here to plain damage — this project's damage-with-stat-change-chance effect only ever applies to the move's target, never the user, on a damaging move (see the existing Generation 1 movepool's own convention).",

    type: "steel",
    category: "physical",

    power: 50,
    accuracy: 95,
    maxPp: 35,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "steel-wing",
    name: "Steel Wing",
    generation: 2,
    introducedGeneration: 2,
    description:
      "A wing strike coated in steel. Has a 10% chance to raise the user's own Defense in the original games; simplified here to plain damage for the same self-buff-on-damage reason as Metal Claw above.",

    type: "steel",
    category: "physical",

    power: 70,
    accuracy: 90,
    maxPp: 25,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "iron-tail",
    name: "Iron Tail",
    generation: 2,
    introducedGeneration: 2,
    description: "A steel-hard tail slam that may lower the target's Defense by one stage.",

    type: "steel",
    category: "physical",

    power: 100,
    accuracy: 75,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-stat-change-chance",
      changes: [{ stat: "defense", stages: -1 }],
      chancePercent: 30,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
