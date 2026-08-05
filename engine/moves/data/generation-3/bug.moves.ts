// Bug-type moves introduced in Generation 3.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_3_BUG_MOVES: Move[] = [
  {
    id: "tail-glow",
    name: "Tail Glow",
    generation: 3,
    introducedGeneration: 3,
    description: "The user stares at flashing lights to sharply raise its Special Attack stat.",
    type: "bug",
    category: "status",
    power: null,
    accuracy: null,
    maxPp: 20,
    priority: 0,
    target: "self",
    effect: { kind: "stat-change", changes: [{ stat: "specialAttack", stages: 2 }] },
    flags: [],
    implementationStatus: "data-only",
  },
  {
    id: "signal-beam",
    name: "Signal Beam",
    generation: 3,
    introducedGeneration: 3,
    description: "The user attacks with a sinister beam of light, which may also confuse the target.",
    type: "bug",
    category: "special",
    power: 75,
    accuracy: 100,
    maxPp: 15,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-status-chance", status: "confusion", chancePercent: 10 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
