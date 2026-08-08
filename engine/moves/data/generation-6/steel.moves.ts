import type { Move } from "../../types/move.types.ts";

export const GENERATION_6_STEEL_MOVES: Move[] = [
  {
    id: "kings-shield",
    name: "King's Shield",
    generation: 6,
    introducedGeneration: 6,
    description: "The user takes a defensive stance while it protects itself from damage. It also harshly lowers the Attack of any attacker that makes direct contact in the original games — approximated with the existing protect effect, same as Spiky Shield/Mat Block (the contact-punish nuance is dropped).",
    type: "steel",
    category: "status",
    power: null,
    accuracy: null,
    maxPp: 10,
    priority: 4,
    target: "self",
    effect: { kind: "protect" },
    flags: [],
    implementationStatus: "data-only",
  },
];
