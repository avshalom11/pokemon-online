import type { Move } from "../../types/move.types.ts";

// Ice-type moves genuinely introduced in Generation 7.
export const GENERATION_7_ICE_MOVES: Move[] = [
  {
    id: "ice-hammer",
    name: "Ice Hammer",
    generation: 7,
    introducedGeneration: 7,
    description: "The user swings and hits the target with its strong, heavy fist, but this lowers the user's own Speed.",
    type: "ice",
    category: "physical",
    power: 100,
    accuracy: 90,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-stat-change-chance", changes: [{ stat: "speed", stages: -1 }], chancePercent: 100 },
    flags: ["makesContact", "protectable", "mirrorMove", "punching"],
    implementationStatus: "data-only",
  },
  {
    id: "aurora-veil",
    name: "Aurora Veil",
    generation: 7,
    introducedGeneration: 7,
    description: "This move reduces damage from physical and special moves for five turns — combining Reflect and Light Screen into a single effect, usable only while Hail is active in the real games. Weather isn't modeled here, and this project's screen effect only ever represents one screen type at a time — approximated as Light Screen, the same 'documented single-kind approximation' precedent Crafty Shield already established for its own dropped real-game nuance.",
    type: "ice",
    category: "status",
    power: null,
    accuracy: null,
    maxPp: 20,
    priority: 0,
    target: "self",
    effect: { kind: "screen", screen: "light-screen" },
    flags: [],
    implementationStatus: "data-only",
  },
];
