import type { BattleEffectiveness } from "@/engine/damage";
import type { StatName } from "@/engine/moves";

import type { MajorStatus } from "../status/major-status";
import type { VolatileConditionKind } from "../volatile/volatile-condition.types";

// Phase 6A — structured Battle Events. Pure data describing what happened
// during a turn, produced by the gameplay/orchestration layer (see
// build-attack-events.ts, resolve-move-effects.ts, and
// battle-action.service.ts) from the Damage Engine's own already-computed
// Battle Outcome Metadata (Phase 5G) plus the Phase 6D-6I Move Effects/
// stat-stage/status systems — never invented here, never generated as
// text here. Text/translation is strictly the presentation layer's job
// (see features/battle/utils/format-battle-events.ts).

export type BattleActor = "player" | "enemy";

export type BattleEvent =
  | { type: "move-used"; actor: BattleActor; pokemonId: string; moveId: string }
  | { type: "move-missed"; actor: BattleActor; pokemonId: string; moveId: string }
  | { type: "damage-dealt"; actor: BattleActor; target: BattleActor; damage: number; remainingHp: number }
  | { type: "critical-hit"; actor: BattleActor }
  | { type: "effectiveness"; actor: BattleActor; value: Exclude<BattleEffectiveness, "normal"> }
  | { type: "fainted"; actor: BattleActor; pokemonId: string }
  // Phase 6-cleanup — "fainted-before-action": actor's own Pokémon
  // fainted (from the other side's attack) before it could act.
  // "no-valid-target": actor's own Pokémon is fine, but the side it would
  // attack has already fainted for some other reason (e.g. the first
  // actor's own recoil) — there is simply nothing left to attack.
  | { type: "action-skipped"; actor: BattleActor; reason: "fainted-before-action" | "no-valid-target" }
  // Phase 6E — stat stages. `actor` is whose stage changed (the effect's
  // own target, self or opponent — already resolved before the event is
  // built, never re-derived by the presentation layer).
  | { type: "stat-stage-changed"; actor: BattleActor; stat: StatName; previousStage: number; newStage: number }
  | { type: "stat-stage-limit"; actor: BattleActor; stat: StatName; direction: "higher" | "lower" }
  // Phase 6F — major status infliction.
  | { type: "status-applied"; actor: BattleActor; status: MajorStatus }
  | { type: "status-application-failed"; actor: BattleActor; status: MajorStatus; reason: "already-statused" | "immune" }
  // Phase 6G — status behavior at pre-action time. `actor` is whose own
  // status affected it.
  | { type: "status-prevented-action"; actor: BattleActor; status: "paralysis" | "sleep" | "freeze" }
  | { type: "status-recovered"; actor: BattleActor; status: "sleep" | "freeze" }
  // Phase 6H — end-of-turn residual damage.
  | { type: "status-damage"; actor: BattleActor; status: "burn" | "poison"; damage: number; remainingHp: number }
  // Phase 6J — healing moves (Recover, Soft-Boiled, Rest, ...) and drain
  // moves (Absorb, Mega Drain, Leech Life, Dream Eater, ...) both restore
  // HP to `actor`; source distinguishes which produced it, since the
  // Hebrew wording differs ("healed itself" vs. "drained HP").
  | { type: "healed"; actor: BattleActor; amount: number; remainingHp: number; source: "move" | "drain" }
  | { type: "healing-failed"; actor: BattleActor; reason: "full-hp" }
  // Phase 6K — recoil moves (Take Down, Double-Edge, Submission, ...).
  // `actor` is whoever used the move (and takes the damage), not the
  // target.
  | { type: "recoil-damage"; actor: BattleActor; damage: number; remainingHp: number }
  // Phase 6L — multi-hit moves. Emitted once, after the whole hit
  // sequence completes (or stops early on a faint) — the individual hits
  // themselves reuse the existing damage-dealt/critical-hit/effectiveness/
  // fainted events, never a parallel per-hit event shape.
  | { type: "multi-hit-complete"; actor: BattleActor; hits: number }
  // Phase 7 — Volatile Conditions. `actor` is always whose OWN volatile
  // state the event describes (never the move's user when different —
  // already resolved by the caller from the move's own `target` field,
  // same convention every other event above already uses).
  | { type: "volatile-applied"; actor: BattleActor; condition: VolatileConditionKind }
  | {
      type: "volatile-application-failed";
      actor: BattleActor;
      condition: VolatileConditionKind;
      reason: "no-valid-move" | "immune" | "already-active" | "failed";
    }
  | { type: "volatile-prevented-action"; actor: BattleActor; condition: "flinch" | "confusion" }
  | { type: "volatile-recovered"; actor: BattleActor; condition: "confusion" }
  | { type: "confusion-self-damage"; actor: BattleActor; damage: number; remainingHp: number }
  // `actor` is whoever BLOCKED the incoming attack (the protected side).
  | { type: "protected"; actor: BattleActor }
  // `actor` is whoever's move got disabled/whoever got encored.
  | { type: "move-disabled"; actor: BattleActor; moveId: string }
  | { type: "encore-applied"; actor: BattleActor; moveId: string }
  | { type: "leech-seed-damage"; actor: BattleActor; damage: number; remainingHp: number }
  | { type: "trapping-damage"; actor: BattleActor; damage: number; remainingHp: number }
  // A finite-duration volatile condition (protect/disable/encore/trapping)
  // expiring naturally at end-of-turn.
  | { type: "volatile-ended"; actor: BattleActor; condition: VolatileConditionKind };
