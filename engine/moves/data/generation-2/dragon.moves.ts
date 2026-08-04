// Dragon-type moves introduced in Generation 2.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_DRAGON_MOVES: Move[] = [
  {
    id: "dragon-breath",
    name: "Dragon Breath",
    generation: 2,
    introducedGeneration: 2,
    description: "The user exhales a mighty gust that may paralyze the target.",

    type: "dragon",
    category: "special",

    power: 60,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "paralysis",
      chancePercent: 30,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "twister",
    name: "Twister",
    generation: 2,
    introducedGeneration: 2,
    description: "The user whips up a vicious tornado that may make opponents it hits flinch.",

    type: "dragon",
    category: "special",

    power: 40,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "all-opponents",

    effect: {
      kind: "damage-with-status-chance",
      status: "flinch",
      chancePercent: 20,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
