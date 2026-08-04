// Normal-type moves introduced in Generation 2.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_NORMAL_MOVES: Move[] = [
  {
    id: "foresight",
    name: "Foresight",
    generation: 2,
    introducedGeneration: 2,
    description:
      "Identifies the target, negating any evasion boost and letting Normal- and Fighting-type moves hit a Ghost-type target. This project's battle engine does not yet model evasion overrides or type-immunity bypasses, so this move currently has no effect.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 40,

    priority: 0,

    target: "opponent",

    effect: { kind: "no-effect" },

    flags: ["protectable"],

    implementationStatus: "data-only",
  },

  {
    id: "sweet-scent",
    name: "Sweet Scent",
    generation: 2,
    introducedGeneration: 2,
    description: "Lowers the target's evasiveness by one stage.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "stat-change",
      changes: [{ stat: "evasion", stages: -1 }],
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "attract",
    name: "Attract",
    generation: 2,
    introducedGeneration: 2,
    description:
      "Makes the target infatuated, giving it a chance to be unable to attack. This project's battle engine does not yet model infatuation, so this move currently has no effect.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: { kind: "no-effect" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "safeguard",
    name: "Safeguard",
    generation: 2,
    introducedGeneration: 2,
    description:
      "Protects the user's side from status conditions for five turns. This project's battle engine does not yet model team-wide protective fields, so this move currently has no effect.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 25,

    priority: 0,

    target: "self",

    effect: { kind: "no-effect" },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "baton-pass",
    name: "Baton Pass",
    generation: 2,
    introducedGeneration: 2,
    description: "The user switches out, passing any stat changes to the incoming Pokémon.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 40,

    priority: 0,

    target: "self",

    effect: { kind: "switch-out" },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "belly-drum",
    name: "Belly Drum",
    generation: 2,
    introducedGeneration: 2,
    description:
      "The user maximizes its Attack in exchange for half its maximum HP. Simplified here to a flat +2 Attack stage with no HP cost — this project's stat-stage system caps at +6/-6 and has no move-triggered self-damage mechanic yet.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 10,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [{ stat: "attack", stages: 2 }],
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "endure",
    name: "Endure",
    generation: 2,
    introducedGeneration: 2,
    description:
      "The user survives any hit with at least 1 HP this turn. Represented with the existing generic \"protect\" effect kind (data-only, same as Protect/Detect) rather than a dedicated survive-at-1-HP mechanic, which this project's battle engine does not yet implement.",

    type: "normal",
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

  {
    id: "return",
    name: "Return",
    generation: 2,
    introducedGeneration: 2,
    description:
      "A physical attack whose real power scales with the user's friendship. Represented here with a flat power of 102 (the maximum-friendship value) since this project's battle engine has no friendship-gain system yet — see data/pokemon/pokemon-evolutions.ts's own friendship scope note.",

    type: "normal",
    category: "physical",

    power: 102,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "encore",
    name: "Encore",
    generation: 2,
    introducedGeneration: 2,
    description: "Forces the target to repeat its last move for several turns.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 5,

    priority: 0,

    target: "opponent",

    effect: { kind: "encore" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
