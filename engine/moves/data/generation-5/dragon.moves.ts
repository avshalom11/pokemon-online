// Dragon-type moves introduced in Generation 5.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_5_DRAGON_MOVES: Move[] = [
  {
    id: "dragon-tail",
    name: "Dragon Tail",
    generation: 5,
    introducedGeneration: 5,
    description: "The user knocks away the target and drags out a different Pokémon. This project has no forced-switch-after-damage mechanic, so this resolves as a plain damaging move.",
    type: "dragon",
    category: "physical",
    power: 60,
    accuracy: 90,
    maxPp: 10,
    priority: -6,
    target: "opponent",
    effect: { kind: "damage" },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
  {
    id: "dual-chop",
    name: "Dual Chop",
    generation: 5,
    introducedGeneration: 5,
    description: "The user attacks the target by hitting it with brutal strikes twice in a row.",
    type: "dragon",
    category: "physical",
    power: 40,
    accuracy: 90,
    maxPp: 15,
    priority: 0,
    target: "opponent",
    effect: { kind: "multi-hit", minHits: 2, maxHits: 2 },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
