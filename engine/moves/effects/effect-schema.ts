import { z } from "zod";

import { ALL_STATUS_CONDITIONS, ALL_STAT_NAMES, ALL_SCREEN_TYPES } from "./effect-types.ts";

export const statusConditionSchema = z.enum(ALL_STATUS_CONDITIONS);
export const statNameSchema = z.enum(ALL_STAT_NAMES);
export const screenTypeSchema = z.enum(ALL_SCREEN_TYPES);

export const statStageChangeSchema = z.object({
  stat: statNameSchema,
  // Stage magnitude: real stat stages range -6..+6; 0 would be a no-op and
  // is rejected so authors don't accidentally leave a change with no effect.
  stages: z.int().min(-6).max(6).refine((value) => value !== 0, {
    message: "stat stage change must not be 0",
  }),
});

const chancePercentSchema = z.number().int().min(1).max(100);
const percentOfMaxHpSchema = z.number().int().min(1).max(100);

const fixedDamageBasisSchema = z.discriminatedUnion("basis", [
  z.object({ basis: z.literal("level") }),
  z.object({ basis: z.literal("set-amount"), amount: z.int().positive() }),
]);

export const moveEffectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("damage") }),
  z.object({
    kind: z.literal("damage-with-status-chance"),
    status: statusConditionSchema,
    chancePercent: chancePercentSchema,
  }),
  z.object({
    kind: z.literal("stat-change"),
    changes: z.array(statStageChangeSchema).min(1),
  }),
  z.object({
    kind: z.literal("heal"),
    healPercent: percentOfMaxHpSchema,
  }),
  z.object({
    kind: z.literal("fixed-damage"),
    damage: fixedDamageBasisSchema,
  }),
  z.object({
    kind: z.literal("recoil"),
    recoilPercent: percentOfMaxHpSchema,
  }),
  z.object({
    kind: z.literal("multi-hit"),
    minHits: z.int().min(2),
    maxHits: z.int().min(2),
  }).refine((value) => value.maxHits >= value.minHits, {
    message: "multi-hit maxHits must be >= minHits",
    path: ["maxHits"],
  }),
  z.object({
    kind: z.literal("charge"),
    invulnerable: z.boolean(),
  }),
  z.object({ kind: z.literal("ohko") }),
  z.object({ kind: z.literal("copy-move") }),
  z.object({ kind: z.literal("transform") }),
  z.object({
    kind: z.literal("status"),
    status: statusConditionSchema,
  }),
  // --- Phase 3B additions (see the MoveEffect comment in effect-types.ts) ---
  z.object({
    kind: z.literal("damage-with-stat-change-chance"),
    changes: z.array(statStageChangeSchema).min(1),
    chancePercent: chancePercentSchema,
  }),
  z.object({
    kind: z.literal("drain"),
    drainPercent: percentOfMaxHpSchema,
  }),
  z.object({ kind: z.literal("partial-trap") }),
  z.object({
    kind: z.literal("screen"),
    screen: screenTypeSchema,
  }),
  z.object({ kind: z.literal("force-switch") }),
  z.object({ kind: z.literal("crit-rate-up") }),
  z.object({ kind: z.literal("leech-seed") }),
  z.object({ kind: z.literal("random-move") }),
  z.object({
    kind: z.literal("counter"),
    category: z.enum(["physical", "special"]),
  }),
  z.object({ kind: z.literal("bide") }),
  z.object({ kind: z.literal("reset-stats") }),
  z.object({ kind: z.literal("disable-move") }),
  z.object({
    kind: z.literal("substitute"),
    hpCostPercent: percentOfMaxHpSchema,
  }),
  z.object({ kind: z.literal("type-change") }),
  z.object({ kind: z.literal("switch-out") }),
  z.object({ kind: z.literal("no-effect") }),
  z.object({
    kind: z.literal("current-hp-percent-damage"),
    percent: percentOfMaxHpSchema,
  }),
  z.object({ kind: z.literal("random-level-damage") }),
  z.object({ kind: z.literal("weight-based-damage") }),
  // --- Phase 7 additions (Volatile Conditions) — see the MoveEffect
  // comment in effect-types.ts ---
  z.object({ kind: z.literal("protect") }),
  z.object({ kind: z.literal("encore") }),
]);

// The kinds of effect that calculate damage via the power/stat formula —
// moves with one of these effects must carry a positive-integer `power`.
export const POWER_BASED_EFFECT_KINDS = [
  "damage",
  "damage-with-status-chance",
  "recoil",
  "multi-hit",
  "charge",
  "damage-with-stat-change-chance",
  "drain",
  "partial-trap",
] as const;

// The kinds of effect that never use the power formula (either no damage,
// or damage computed some other way) — moves with one of these must carry
// `power: null`.
export const POWERLESS_EFFECT_KINDS = [
  "stat-change",
  "heal",
  "fixed-damage",
  "ohko",
  "copy-move",
  "transform",
  "status",
  "screen",
  "force-switch",
  "crit-rate-up",
  "leech-seed",
  "random-move",
  "counter",
  "bide",
  "reset-stats",
  "disable-move",
  "substitute",
  "type-change",
  "switch-out",
  "no-effect",
  "current-hp-percent-damage",
  "random-level-damage",
  "weight-based-damage",
  "protect",
  "encore",
] as const;
