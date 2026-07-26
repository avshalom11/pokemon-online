// Normal-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_NORMAL_MOVES: Move[] = [
  {
    id: "pound",
    name: "Pound",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "normal",
    category: "physical",

    power: 40,
    accuracy: 100,
    maxPp: 35,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "double-slap",
    name: "Double Slap",
    generation: 1,
    introducedGeneration: 1,
    description: "Hits two to five times. Has a 35% chance to hit two or three times and a 15% chance to hit four or five times. If one of the hits breaks the target's substitute, it will take damage for the remaining hits. If the user has the Skill Link Ability, this move will always hit five times.",

    type: "normal",
    category: "physical",

    power: 15,
    accuracy: 85,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "multi-hit",
      minHits: 2,
      maxHits: 5,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "comet-punch",
    name: "Comet Punch",
    generation: 1,
    introducedGeneration: 1,
    description: "Hits two to five times. Has a 35% chance to hit two or three times and a 15% chance to hit four or five times. If one of the hits breaks the target's substitute, it will take damage for the remaining hits. If the user has the Skill Link Ability, this move will always hit five times.",

    type: "normal",
    category: "physical",

    power: 18,
    accuracy: 85,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "multi-hit",
      minHits: 2,
      maxHits: 5,
    },

    flags: ["makesContact", "protectable", "mirrorMove", "punching"],

    implementationStatus: "data-only",
  },

  {
    id: "mega-punch",
    name: "Mega Punch",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "normal",
    category: "physical",

    power: 80,
    accuracy: 85,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove", "punching"],

    implementationStatus: "data-only",
  },

  {
    id: "pay-day",
    name: "Pay Day",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "normal",
    category: "physical",

    power: 40,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "scratch",
    name: "Scratch",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "normal",
    category: "physical",

    power: 40,
    accuracy: 100,
    maxPp: 35,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "vise-grip",
    name: "Vise Grip",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "normal",
    category: "physical",

    power: 55,
    accuracy: 100,
    maxPp: 30,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "guillotine",
    name: "Guillotine",
    generation: 1,
    introducedGeneration: 1,
    description: "Deals damage to the target equal to the target's maximum HP. Ignores accuracy and evasiveness modifiers. This attack's accuracy is equal to (user's level - target's level + 30)%, and fails if the target is at a higher level. Pokemon with the Sturdy Ability are immune.",

    type: "normal",
    category: "physical",

    power: null,
    accuracy: 30,
    maxPp: 5,

    priority: 0,

    target: "opponent",

    effect: { kind: "ohko" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "razor-wind",
    name: "Razor Wind",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a higher chance for a critical hit. This attack charges on the first turn and executes on the second. If the user is holding a Power Herb, the move completes in one turn.",

    type: "normal",
    category: "special",

    power: 80,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "all-opponents",

    effect: {
      kind: "charge",
      invulnerable: false,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "swords-dance",
    name: "Swords Dance",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's Attack by 2 stages.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 20,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "attack", stages: 2 },
      ],
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "cut",
    name: "Cut",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "normal",
    category: "physical",

    power: 50,
    accuracy: 95,
    maxPp: 30,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove", "slicing"],

    implementationStatus: "data-only",
  },

  {
    id: "whirlwind",
    name: "Whirlwind",
    generation: 1,
    introducedGeneration: 1,
    description: "The target is forced to switch out and be replaced with a random unfainted ally. Fails if the target is the last unfainted Pokemon in its party, or if the target used Ingrain previously or has the Suction Cups Ability.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 20,

    priority: -6,

    target: "opponent",

    effect: { kind: "force-switch" },

    flags: ["mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "bind",
    name: "Bind",
    generation: 1,
    introducedGeneration: 1,
    description: "Prevents the target from switching for four or five turns (seven turns if the user is holding Grip Claw). Causes damage to the target equal to 1/8 of its maximum HP (1/6 if the user is holding Binding Band), rounded down, at the end of each turn during effect. The target can still switch out if it is holding Shed Shell or uses Baton Pass, Flip Turn, Parting Shot, Shed Tail, Teleport, U-turn, or Volt Switch. The effect ends if either the user or the target leaves the field, or if the target uses Mortal Spin, Rapid Spin, or Substitute successfully. This effect is not stackable or reset by using this or another binding move.",

    type: "normal",
    category: "physical",

    power: 15,
    accuracy: 85,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "partial-trap" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "slam",
    name: "Slam",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "normal",
    category: "physical",

    power: 80,
    accuracy: 75,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "stomp",
    name: "Stomp",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 30% chance to make the target flinch. Damage doubles and no accuracy check is done if the target has used Minimize while active.",

    type: "normal",
    category: "physical",

    power: 65,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "flinch",
      chancePercent: 30,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "mega-kick",
    name: "Mega Kick",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "normal",
    category: "physical",

    power: 120,
    accuracy: 75,
    maxPp: 5,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "headbutt",
    name: "Headbutt",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 30% chance to make the target flinch.",

    type: "normal",
    category: "physical",

    power: 70,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "flinch",
      chancePercent: 30,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "horn-attack",
    name: "Horn Attack",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "normal",
    category: "physical",

    power: 65,
    accuracy: 100,
    maxPp: 25,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "fury-attack",
    name: "Fury Attack",
    generation: 1,
    introducedGeneration: 1,
    description: "Hits two to five times. Has a 35% chance to hit two or three times and a 15% chance to hit four or five times. If one of the hits breaks the target's substitute, it will take damage for the remaining hits. If the user has the Skill Link Ability, this move will always hit five times. If the user is holding Loaded Dice, this move will hit 4-5 times.",

    type: "normal",
    category: "physical",

    power: 15,
    accuracy: 85,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "multi-hit",
      minHits: 2,
      maxHits: 5,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "horn-drill",
    name: "Horn Drill",
    generation: 1,
    introducedGeneration: 1,
    description: "Deals damage to the target equal to the target's maximum HP. Ignores accuracy and evasiveness modifiers. This attack's accuracy is equal to (user's level - target's level + 30)%, and fails if the target is at a higher level. Pokemon with the Sturdy Ability are immune.",

    type: "normal",
    category: "physical",

    power: null,
    accuracy: 30,
    maxPp: 5,

    priority: 0,

    target: "opponent",

    effect: { kind: "ohko" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "tackle",
    name: "Tackle",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "normal",
    category: "physical",

    power: 40,
    accuracy: 100,
    maxPp: 35,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "body-slam",
    name: "Body Slam",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 30% chance to paralyze the target. Damage doubles and no accuracy check is done if the target has used Minimize while active.",

    type: "normal",
    category: "physical",

    power: 85,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "paralysis",
      chancePercent: 30,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "wrap",
    name: "Wrap",
    generation: 1,
    introducedGeneration: 1,
    description: "Prevents the target from switching for four or five turns (seven turns if the user is holding Grip Claw). Causes damage to the target equal to 1/8 of its maximum HP (1/6 if the user is holding Binding Band), rounded down, at the end of each turn during effect. The target can still switch out if it is holding Shed Shell or uses Baton Pass, Flip Turn, Parting Shot, Shed Tail, Teleport, U-turn, or Volt Switch. The effect ends if either the user or the target leaves the field, or if the target uses Mortal Spin, Rapid Spin, or Substitute successfully. This effect is not stackable or reset by using this or another binding move.",

    type: "normal",
    category: "physical",

    power: 15,
    accuracy: 90,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "partial-trap" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "take-down",
    name: "Take Down",
    generation: 1,
    introducedGeneration: 1,
    description: "If the target lost HP, the user takes recoil damage equal to 1/4 the HP lost by the target, rounded half up, but not less than 1 HP.",

    type: "normal",
    category: "physical",

    power: 90,
    accuracy: 85,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "recoil",
      recoilPercent: 25,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "thrash",
    name: "Thrash",
    generation: 1,
    introducedGeneration: 1,
    description: "The user spends two or three turns locked into this move and becomes confused immediately after its move on the last turn of the effect if it is not already. This move targets an opposing Pokemon at random on each turn. If the user is prevented from moving, is asleep at the beginning of a turn, or the attack is not successful against the target on the first turn of the effect or the second turn of a three-turn effect, the effect ends without causing confusion. If this move is called by Sleep Talk and the user is asleep, the move is used for one turn and does not confuse the user.",

    type: "normal",
    category: "physical",

    power: 120,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "random-opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "double-edge",
    name: "Double-Edge",
    generation: 1,
    introducedGeneration: 1,
    description: "If the target lost HP, the user takes recoil damage equal to 33% the HP lost by the target, rounded half up, but not less than 1 HP.",

    type: "normal",
    category: "physical",

    power: 120,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "recoil",
      recoilPercent: 33,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "tail-whip",
    name: "Tail Whip",
    generation: 1,
    introducedGeneration: 1,
    description: "Lowers the target's Defense by 1 stage.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 30,

    priority: 0,

    target: "all-opponents",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "defense", stages: -1 },
      ],
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "leer",
    name: "Leer",
    generation: 1,
    introducedGeneration: 1,
    description: "Lowers the target's Defense by 1 stage.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 30,

    priority: 0,

    target: "all-opponents",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "defense", stages: -1 },
      ],
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "growl",
    name: "Growl",
    generation: 1,
    introducedGeneration: 1,
    description: "Lowers the target's Attack by 1 stage.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 40,

    priority: 0,

    target: "all-opponents",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "attack", stages: -1 },
      ],
    },

    flags: ["protectable", "mirrorMove", "soundBased"],

    implementationStatus: "data-only",
  },

  {
    id: "roar",
    name: "Roar",
    generation: 1,
    introducedGeneration: 1,
    description: "The target is forced to switch out and be replaced with a random unfainted ally. Fails if the target is the last unfainted Pokemon in its party, or if the target used Ingrain previously or has the Suction Cups Ability.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 20,

    priority: -6,

    target: "opponent",

    effect: { kind: "force-switch" },

    flags: ["mirrorMove", "soundBased"],

    implementationStatus: "data-only",
  },

  {
    id: "sing",
    name: "Sing",
    generation: 1,
    introducedGeneration: 1,
    description: "Causes the target to fall asleep.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 55,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "status",
      status: "sleep",
    },

    flags: ["protectable", "mirrorMove", "soundBased"],

    implementationStatus: "data-only",
  },

  {
    id: "supersonic",
    name: "Supersonic",
    generation: 1,
    introducedGeneration: 1,
    description: "Causes the target to become confused.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 55,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "status",
      status: "confusion",
    },

    flags: ["protectable", "mirrorMove", "soundBased"],

    implementationStatus: "data-only",
  },

  {
    id: "sonic-boom",
    name: "Sonic Boom",
    generation: 1,
    introducedGeneration: 1,
    description: "Deals 20 HP of damage to the target.",

    type: "normal",
    category: "special",

    power: null,
    accuracy: 90,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "fixed-damage",
      damage: {
        basis: "set-amount",
        amount: 20,
      },
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "disable",
    name: "Disable",
    generation: 1,
    introducedGeneration: 1,
    description: "For 4 turns, the target's last move used becomes disabled. Fails if one of the target's moves is already disabled, if the target has not made a move, if the target no longer knows the move, or if the move was a Max or G-Max Move.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "disable-move" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "hyper-beam",
    name: "Hyper Beam",
    generation: 1,
    introducedGeneration: 1,
    description: "If this move is successful, the user must recharge on the following turn and cannot select a move.",

    type: "normal",
    category: "special",

    power: 150,
    accuracy: 90,
    maxPp: 5,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "strength",
    name: "Strength",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "normal",
    category: "physical",

    power: 80,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "growth",
    name: "Growth",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's Attack and Special Attack by 1 stage. If the weather is Sunny Day or Desolate Land, this move raises the user's Attack and Special Attack by 2 stages. If the user is holding Utility Umbrella, this move will only raise the user's Attack and Special Attack by 1 stage, even if the weather is Sunny Day or Desolate Land.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 20,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "attack", stages: 1 },
        { stat: "specialAttack", stages: 1 },
      ],
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "quick-attack",
    name: "Quick Attack",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "normal",
    category: "physical",

    power: 40,
    accuracy: 100,
    maxPp: 30,

    priority: 1,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "rage",
    name: "Rage",
    generation: 1,
    introducedGeneration: 1,
    description: "Once this move is successfully used, the user's Attack is raised by 1 stage every time it is hit by another Pokemon's attack as long as this move is chosen for use.",

    type: "normal",
    category: "physical",

    power: 20,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "mimic",
    name: "Mimic",
    generation: 1,
    introducedGeneration: 1,
    description: "While the user remains active, this move is replaced by the last move used by the target. The copied move has the maximum PP for that move. Fails if the target has not made a move, if the user has Transformed, if the user already knows the move, or if the move is Assist, Behemoth Bash, Behemoth Blade, Belch, Blazing Torque, Celebrate, Chatter, Combat Torque, Copycat, Dynamax Cannon, Hold Hands, Magical Torque, Me First, Metronome, Mimic, Mirror Move, Nature Power, Noxious Torque, Sketch, Sleep Talk, Struggle, Tera Starstorm, Transform, or Wicked Torque.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: { kind: "copy-move" },

    flags: ["protectable"],

    implementationStatus: "data-only",
  },

  {
    id: "screech",
    name: "Screech",
    generation: 1,
    introducedGeneration: 1,
    description: "Lowers the target's Defense by 2 stages.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 85,
    maxPp: 40,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "defense", stages: -2 },
      ],
    },

    flags: ["protectable", "mirrorMove", "soundBased"],

    implementationStatus: "data-only",
  },

  {
    id: "double-team",
    name: "Double Team",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's evasiveness by 1 stage.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 15,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "evasion", stages: 1 },
      ],
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "recover",
    name: "Recover",
    generation: 1,
    introducedGeneration: 1,
    description: "The user restores 1/2 of its maximum HP, rounded half up.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 5,

    priority: 0,

    target: "self",

    effect: {
      kind: "heal",
      healPercent: 50,
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "harden",
    name: "Harden",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's Defense by 1 stage.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 30,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "defense", stages: 1 },
      ],
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "minimize",
    name: "Minimize",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's evasiveness by 2 stages. Whether or not the user's evasiveness was changed, Body Slam, Dragon Rush, Flying Press, Heat Crash, Heavy Slam, Malicious Moonsault, Steamroller, Stomp, and Supercell Slam will not check accuracy and have their damage doubled if used against the user while it is active.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 10,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "evasion", stages: 2 },
      ],
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "smokescreen",
    name: "Smokescreen",
    generation: 1,
    introducedGeneration: 1,
    description: "Lowers the target's accuracy by 1 stage.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "accuracy", stages: -1 },
      ],
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "defense-curl",
    name: "Defense Curl",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's Defense by 1 stage. As long as the user remains active, the power of the user's Ice Ball and Rollout will be doubled (this effect is not stackable).",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 40,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "defense", stages: 1 },
      ],
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "focus-energy",
    name: "Focus Energy",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's chance for a critical hit by 2 stages. Fails if the user already has the effect. Baton Pass can be used to transfer this effect to an ally.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 30,

    priority: 0,

    target: "self",

    effect: { kind: "crit-rate-up" },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "bide",
    name: "Bide",
    generation: 1,
    introducedGeneration: 1,
    description: "The user spends two turns locked into this move and then, on the second turn after using this move, the user attacks the last Pokemon that hit it, inflicting double the damage in HP it lost to attacks during the two turns. If the last Pokemon that hit it is no longer active, the user attacks a random opposing Pokemon instead. If the user is prevented from moving during this move's use, the effect ends. This move does not check accuracy and does not ignore type immunity.",

    type: "normal",
    category: "physical",

    power: null,
    accuracy: null,
    maxPp: 10,

    priority: 1,

    target: "self",

    effect: { kind: "bide" },

    flags: ["makesContact", "protectable"],

    implementationStatus: "data-only",
  },

  {
    id: "metronome",
    name: "Metronome",
    generation: 1,
    introducedGeneration: 1,
    description: "A random move is selected for use, other than After You, Apple Acid, Armor Cannon, Assist, Astral Barrage, Aura Wheel, Baneful Bunker, Beak Blast, Behemoth Bash, Behemoth Blade, Belch, Bestow, Blazing Torque, Body Press, Branch Poke, Breaking Swipe, Celebrate, Chatter, Chilling Water, Chilly Reception, Clangorous Soul, Collision Course, Combat Torque, Comeuppance, Copycat, Counter, Covet, Crafty Shield, Decorate, Destiny Bond, Detect, Diamond Storm, Doodle, Double Iron Bash, Double Shock, Dragon Ascent, Dragon Energy, Drum Beating, Dynamax Cannon, Electro Drift, Endure, Eternabeam, False Surrender, Feint, Fiery Wrath, Fillet Away, Fleur Cannon, Focus Punch, Follow Me, Freeze Shock, Freezing Glare, Glacial Lance, Grav Apple, Helping Hand, Hold Hands, Hyper Drill, Hyperspace Fury, Hyperspace Hole, Ice Burn, Instruct, Jet Punch, Jungle Healing, King's Shield, Life Dew, Light of Ruin, Magical Torque, Make It Rain, Mat Block, Me First, Meteor Assault, Metronome, Mimic, Mind Blown, Mirror Coat, Mirror Move, Moongeist Beam, Nature Power, Nature's Madness, Noxious Torque, Obstruct, Order Up, Origin Pulse, Overdrive, Photon Geyser, Plasma Fists, Population Bomb, Pounce, Power Shift, Precipice Blades, Protect, Pyro Ball, Quash, Quick Guard, Rage Fist, Rage Powder, Raging Bull, Raging Fury, Relic Song, Revival Blessing, Ruination, Salt Cure, Secret Sword, Shed Tail, Shell Trap, Silk Trap, Sketch, Sleep Talk, Snap Trap, Snarl, Snatch, Snore, Snowscape, Spectral Thief, Spicy Extract, Spiky Shield, Spirit Break, Spotlight, Springtide Storm, Steam Eruption, Steel Beam, Strange Steam, Struggle, Sunsteel Strike, Surging Strikes, Switcheroo, Techno Blast, Tera Starstorm, Thief, Thousand Arrows, Thousand Waves, Thunder Cage, Thunderous Kick, Tidy Up, Trailblaze, Transform, Trick, Twin Beam, V-create, Wicked Blow, Wicked Torque, or Wide Guard.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 10,

    priority: 0,

    target: "self",

    effect: { kind: "random-move" },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "self-destruct",
    name: "Self-Destruct",
    generation: 1,
    introducedGeneration: 1,
    description: "The user faints after using this move, even if this move fails for having no target. This move is prevented from executing if any active Pokemon has the Damp Ability.",

    type: "normal",
    category: "physical",

    power: 200,
    accuracy: 100,
    maxPp: 5,

    priority: 0,

    target: "all-pokemon",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "egg-bomb",
    name: "Egg Bomb",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "normal",
    category: "physical",

    power: 100,
    accuracy: 75,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "swift",
    name: "Swift",
    generation: 1,
    introducedGeneration: 1,
    description: "This move does not check accuracy.",

    type: "normal",
    category: "special",

    power: 60,
    accuracy: null,
    maxPp: 20,

    priority: 0,

    target: "all-opponents",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "skull-bash",
    name: "Skull Bash",
    generation: 1,
    introducedGeneration: 1,
    description: "This attack charges on the first turn and executes on the second. Raises the user's Defense by 1 stage on the first turn. If the user is holding a Power Herb, the move completes in one turn.",

    type: "normal",
    category: "physical",

    power: 130,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "charge",
      invulnerable: false,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "spike-cannon",
    name: "Spike Cannon",
    generation: 1,
    introducedGeneration: 1,
    description: "Hits two to five times. Has a 35% chance to hit two or three times and a 15% chance to hit four or five times. If one of the hits breaks the target's substitute, it will take damage for the remaining hits. If the user has the Skill Link Ability, this move will always hit five times.",

    type: "normal",
    category: "physical",

    power: 20,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "multi-hit",
      minHits: 2,
      maxHits: 5,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "constrict",
    name: "Constrict",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to lower the target's Speed by 1 stage.",

    type: "normal",
    category: "physical",

    power: 10,
    accuracy: 100,
    maxPp: 35,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-stat-change-chance",
      chancePercent: 10,
      changes: [
        { stat: "speed", stages: -1 },
      ],
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "soft-boiled",
    name: "Soft-Boiled",
    generation: 1,
    introducedGeneration: 1,
    description: "The user restores 1/2 of its maximum HP, rounded half up.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 5,

    priority: 0,

    target: "self",

    effect: {
      kind: "heal",
      healPercent: 50,
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "glare",
    name: "Glare",
    generation: 1,
    introducedGeneration: 1,
    description: "Paralyzes the target.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 30,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "status",
      status: "paralysis",
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "barrage",
    name: "Barrage",
    generation: 1,
    introducedGeneration: 1,
    description: "Hits two to five times. Has a 35% chance to hit two or three times and a 15% chance to hit four or five times. If one of the hits breaks the target's substitute, it will take damage for the remaining hits. If the user has the Skill Link Ability, this move will always hit five times.",

    type: "normal",
    category: "physical",

    power: 15,
    accuracy: 85,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "multi-hit",
      minHits: 2,
      maxHits: 5,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "lovely-kiss",
    name: "Lovely Kiss",
    generation: 1,
    introducedGeneration: 1,
    description: "Causes the target to fall asleep.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 75,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "status",
      status: "sleep",
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "transform",
    name: "Transform",
    generation: 1,
    introducedGeneration: 1,
    description: "The user transforms into the target. The target's current stats, stat stages, types, moves, Ability, weight, gender, and sprite are copied. The user's level and HP remain the same and each copied move receives only 5 PP, with a maximum of 5 PP each. The user can no longer change formes if it would have the ability to do so. This move fails if it hits a substitute, if either the user or the target is already transformed, or if either is behind an Illusion.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: { kind: "transform" },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "dizzy-punch",
    name: "Dizzy Punch",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 20% chance to confuse the target.",

    type: "normal",
    category: "physical",

    power: 70,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "confusion",
      chancePercent: 20,
    },

    flags: ["makesContact", "protectable", "mirrorMove", "punching"],

    implementationStatus: "data-only",
  },

  {
    id: "flash",
    name: "Flash",
    generation: 1,
    introducedGeneration: 1,
    description: "Lowers the target's accuracy by 1 stage.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "accuracy", stages: -1 },
      ],
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "splash",
    name: "Splash",
    generation: 1,
    introducedGeneration: 1,
    description: "No competitive use.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 40,

    priority: 0,

    target: "self",

    effect: { kind: "no-effect" },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "explosion",
    name: "Explosion",
    generation: 1,
    introducedGeneration: 1,
    description: "The user faints after using this move, even if this move fails for having no target. This move is prevented from executing if any active Pokemon has the Damp Ability.",

    type: "normal",
    category: "physical",

    power: 250,
    accuracy: 100,
    maxPp: 5,

    priority: 0,

    target: "all-pokemon",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "fury-swipes",
    name: "Fury Swipes",
    generation: 1,
    introducedGeneration: 1,
    description: "Hits two to five times. Has a 35% chance to hit two or three times and a 15% chance to hit four or five times. If one of the hits breaks the target's substitute, it will take damage for the remaining hits. If the user has the Skill Link Ability, this move will always hit five times. If the user is holding Loaded Dice, this move will hit 4-5 times.",

    type: "normal",
    category: "physical",

    power: 18,
    accuracy: 80,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "multi-hit",
      minHits: 2,
      maxHits: 5,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "hyper-fang",
    name: "Hyper Fang",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to make the target flinch.",

    type: "normal",
    category: "physical",

    power: 80,
    accuracy: 90,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "flinch",
      chancePercent: 10,
    },

    flags: ["makesContact", "protectable", "mirrorMove", "biting"],

    implementationStatus: "data-only",
  },

  {
    id: "sharpen",
    name: "Sharpen",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's Attack by 1 stage.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 30,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "attack", stages: 1 },
      ],
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "conversion",
    name: "Conversion",
    generation: 1,
    introducedGeneration: 1,
    description: "The user's type changes to match the original type of the move in its first move slot. Fails if the user cannot change its type, or if the type is one of the user's current types.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 30,

    priority: 0,

    target: "self",

    effect: { kind: "type-change" },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "tri-attack",
    name: "Tri Attack",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 20% chance to either burn, freeze, or paralyze the target.",

    type: "normal",
    category: "special",

    power: 80,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "super-fang",
    name: "Super Fang",
    generation: 1,
    introducedGeneration: 1,
    description: "Deals damage to the target equal to half of its current HP, rounded down, but not less than 1 HP.",

    type: "normal",
    category: "physical",

    power: null,
    accuracy: 90,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "current-hp-percent-damage",
      percent: 50,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "slash",
    name: "Slash",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a higher chance for a critical hit.",

    type: "normal",
    category: "physical",

    power: 70,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove", "slicing"],

    implementationStatus: "data-only",
  },

  {
    id: "substitute",
    name: "Substitute",
    generation: 1,
    introducedGeneration: 1,
    description: "The user takes 1/4 of its maximum HP, rounded down, and puts it into a substitute to take its place in battle. The substitute is removed once enough damage is inflicted on it, if the user switches out or faints, or if any Pokemon uses Tidy Up. Baton Pass can be used to transfer the substitute to an ally, and the substitute will keep its remaining HP. Until the substitute is broken, it receives damage from all attacks made by other Pokemon and shields the user from status effects and stat stage changes caused by other Pokemon. Sound-based moves and Pokemon with the Infiltrator Ability ignore substitutes. The user still takes normal damage from weather and status effects while behind its substitute. If the substitute breaks during a multi-hit attack, the user will take damage from any remaining hits. If a substitute is created while the user is trapped by a binding move, the binding effect ends immediately. Fails if the user does not have enough HP remaining to create a substitute without fainting, or if it already has a substitute.",

    type: "normal",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 10,

    priority: 0,

    target: "self",

    effect: {
      kind: "substitute",
      hpCostPercent: 25,
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "struggle",
    name: "Struggle",
    generation: 1,
    introducedGeneration: 1,
    description: "Deals typeless damage to a random opposing Pokemon. If this move was successful, the user loses 1/4 of its maximum HP, rounded half up, and the Rock Head Ability does not prevent this. This move is automatically used if none of the user's known moves can be selected.",

    type: "normal",
    category: "physical",

    power: 50,
    accuracy: null,
    maxPp: 1,

    priority: 0,

    target: "random-opponent",

    effect: {
      kind: "recoil",
      recoilPercent: 25,
    },

    flags: ["makesContact", "protectable"],

    implementationStatus: "data-only",
  },
];
