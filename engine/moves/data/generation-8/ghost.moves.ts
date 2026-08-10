import type { Move } from "../../types/move.types.ts";

// Ghost-type moves genuinely introduced in Generation 8 (Sword/Shield era).
export const GENERATION_8_GHOST_MOVES: Move[] = [
  {
    id: "astral-barrage",
    name: "Astral Barrage",
    generation: 8,
    introducedGeneration: 8,
    description: "The user attacks by sending a frightful amount of small ghosts at opposing Pokémon.",
    type: "ghost",
    category: "special",
    power: 120,
    accuracy: 100,
    maxPp: 5,
    priority: 0,
    target: "all-opponents",
    effect: { kind: "damage" },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
  {
    id: "poltergeist",
    name: "Poltergeist",
    generation: 8,
    introducedGeneration: 8,
    description: "The user attacks the target by controlling the target's held item — the move fails if the target has no held item in the source games. This project has no held-item requirement check, so this always resolves as a plain damaging move.",
    type: "ghost",
    category: "physical",
    power: 110,
    accuracy: 90,
    maxPp: 5,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage" },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
