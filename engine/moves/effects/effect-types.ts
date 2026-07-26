// Status conditions a move can inflict. Kept to the set the battle engine
// will eventually need to model (Generation 1 conditions, plus confusion
// and flinch — both volatile, single-encounter conditions rather than
// persistent major statuses, but described through this same status-chance
// shape at the move-data level since that's how the source data models
// them too).
export const ALL_STATUS_CONDITIONS = [
  "burn",
  "freeze",
  "paralysis",
  "poison",
  "badly-poisoned",
  "sleep",
  "confusion",
  "flinch",
] as const;

export type StatusCondition = (typeof ALL_STATUS_CONDITIONS)[number];

// Stats that can be raised or lowered in stages (-6..+6), separate from the
// base stat block on a Pokémon species — "accuracy" and "evasion" only ever
// exist as stages, they have no base value.
export const ALL_STAT_NAMES = [
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
  "accuracy",
  "evasion",
] as const;

export type StatName = (typeof ALL_STAT_NAMES)[number];

export interface StatStageChange {
  stat: StatName;
  // Positive raises, negative lowers. Magnitude is the number of stages.
  stages: number;
}

// How a fixed-damage move (e.g. Seismic Toss, Sonic Boom) determines its
// damage — bypasses the normal power/stat formula entirely.
export type FixedDamageBasis =
  | { basis: "level" }
  | { basis: "set-amount"; amount: number };

// Team-wide protective field effects (Light Screen, Reflect, Mist). Kept as
// a closed set rather than a free string so a typo can't silently create a
// screen the battle engine will never recognize.
export const ALL_SCREEN_TYPES = ["light-screen", "reflect", "mist"] as const;
export type ScreenType = (typeof ALL_SCREEN_TYPES)[number];

// Every kind of behavior a move can describe. This is data only — the
// battle engine interprets these structures later. Adding a new kind of
// behavior means adding one variant here, not writing per-move code.
//
// The first 12 variants are Phase 3A's original set. Phase 3B (populating
// every Generation 1 move) added the rest below the marker: Generation 1
// introduced several mechanics — trapping, draining, screens, forced
// switches, a random-move caller, a damage counter, a stat-reset move, a
// move-disabler, Substitute, type-changing, escaping, a fixed no-op move,
// current-HP-percentage damage, and level-scaled random damage — that
// don't fit any of the original 12 without misrepresenting the move —
// including weight-scaled damage (Low Kick). Each addition here is a
// reusable mechanic (most recur in later generations too), not a per-move
// special case; no move ID or name ever appears in the battle engine
// because of one of these.
export type MoveEffect =
  | { kind: "damage" }
  | { kind: "damage-with-status-chance"; status: StatusCondition; chancePercent: number }
  | { kind: "stat-change"; changes: StatStageChange[] }
  | { kind: "heal"; healPercent: number }
  | { kind: "fixed-damage"; damage: FixedDamageBasis }
  | { kind: "recoil"; recoilPercent: number }
  | { kind: "multi-hit"; minHits: number; maxHits: number }
  | { kind: "charge"; invulnerable: boolean }
  | { kind: "ohko" }
  | { kind: "copy-move" }
  | { kind: "transform" }
  | { kind: "status"; status: StatusCondition }
  // --- Phase 3B additions ---
  | { kind: "damage-with-stat-change-chance"; changes: StatStageChange[]; chancePercent: number }
  | { kind: "drain"; drainPercent: number }
  | { kind: "partial-trap" }
  | { kind: "screen"; screen: ScreenType }
  | { kind: "force-switch" }
  | { kind: "crit-rate-up" }
  | { kind: "leech-seed" }
  | { kind: "random-move" }
  | { kind: "counter"; category: "physical" | "special" }
  | { kind: "bide" }
  | { kind: "reset-stats" }
  | { kind: "disable-move" }
  | { kind: "substitute"; hpCostPercent: number }
  | { kind: "type-change" }
  | { kind: "switch-out" }
  | { kind: "no-effect" }
  | { kind: "current-hp-percent-damage"; percent: number }
  | { kind: "random-level-damage" }
  | { kind: "weight-based-damage" };

export type MoveEffectKind = MoveEffect["kind"];
