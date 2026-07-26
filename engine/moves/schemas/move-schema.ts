import { z } from "zod";

import { moveEffectSchema, POWER_BASED_EFFECT_KINDS, POWERLESS_EFFECT_KINDS } from "../effects/effect-schema.ts";
import { moveFlagSchema } from "../flags/move-flags.ts";

// Permanent internal identifier — never the display name. Lowercase
// kebab-case slug (e.g. "thunderbolt", "quick-attack", "vine-whip").
export const moveIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "move id must be a lowercase kebab-case slug");

export const moveCategorySchema = z.enum(["physical", "special", "status"]);

// Reusable target system — deliberately generation/format-agnostic so
// double battles don't require redesigning it later.
export const moveTargetSchema = z.enum([
  "self",
  "opponent",
  "all-opponents",
  "all-pokemon",
  "random-opponent",
]);

// Whether the battle engine actually knows how to run this move's effect
// yet. Lets move data exist ahead of the mechanics that interpret it.
export const implementationStatusSchema = z.enum(["implemented", "data-only", "future"]);

// Pokémon elemental types a move can carry. Duplicated here (rather than
// importing shared/types/pokemon's PokemonType) because that type belongs
// to the legacy, currently-dormant move/battle system this engine
// deliberately does not depend on — see engine/moves/README boundary note
// in the barrel file. Keep the two lists in sync by hand until Phase 3B+
// unifies them.
export const moveTypeSchema = z.enum([
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
]);

export type MoveType = z.infer<typeof moveTypeSchema>;

const basePowerSchema = z.int().positive();
const baseAccuracySchema = z.int().min(1).max(100);
const baseMaxPpSchema = z.int().positive();
const basePrioritySchema = z.int().min(-7).max(5);
const baseGenerationSchema = z.int().positive();

export const moveSchema = z
  .object({
    id: moveIdSchema,
    name: z.string().min(1),
    generation: baseGenerationSchema,
    // The generation this exact move data reflects, vs. the generation the
    // move first debuted in. Equal for every move today (nothing has been
    // updated across generations yet), but a future move-balance pass in a
    // later phase could bump `generation` for a specific move while
    // `introducedGeneration` stays fixed at its original debut.
    introducedGeneration: baseGenerationSchema,
    description: z.string().min(1),

    type: moveTypeSchema,
    category: moveCategorySchema,

    power: basePowerSchema.nullable(),
    accuracy: baseAccuracySchema.nullable(),
    maxPp: baseMaxPpSchema,

    priority: basePrioritySchema,

    target: moveTargetSchema,

    effect: moveEffectSchema,

    flags: z.array(moveFlagSchema),

    implementationStatus: implementationStatusSchema,
  })
  .check((ctx) => {
    const move = ctx.value;

    if (move.introducedGeneration > move.generation) {
      ctx.issues.push({
        code: "custom",
        message: `move "${move.id}" has introducedGeneration (${move.introducedGeneration}) after generation (${move.generation})`,
        path: ["introducedGeneration"],
        input: move.introducedGeneration,
      });
    }

    if (move.category === "status" && move.power !== null) {
      ctx.issues.push({
        code: "custom",
        message: `status-category move "${move.id}" must have power: null`,
        path: ["power"],
        input: move.power,
      });
    }

    const isPowerBased = (POWER_BASED_EFFECT_KINDS as readonly string[]).includes(move.effect.kind);
    const isPowerless = (POWERLESS_EFFECT_KINDS as readonly string[]).includes(move.effect.kind);

    if (isPowerBased && move.power === null) {
      ctx.issues.push({
        code: "custom",
        message: `move "${move.id}" has power-based effect "${move.effect.kind}" but power is null`,
        path: ["power"],
        input: move.power,
      });
    }

    if (isPowerless && move.power !== null) {
      ctx.issues.push({
        code: "custom",
        message: `move "${move.id}" has effect "${move.effect.kind}" which never uses the power formula, power must be null`,
        path: ["power"],
        input: move.power,
      });
    }

    if (move.category !== "status" && isPowerless === false && isPowerBased === false) {
      // Effect kinds outside both lists (should not happen once every kind
      // is classified above) — fail loudly instead of silently passing.
      ctx.issues.push({
        code: "custom",
        message: `move "${move.id}" has effect "${move.effect.kind}" which is not classified as power-based or powerless`,
        path: ["effect", "kind"],
        input: move.effect.kind,
      });
    }
  });

export type Move = z.infer<typeof moveSchema>;
export type MoveCategory = z.infer<typeof moveCategorySchema>;
export type MoveTarget = z.infer<typeof moveTargetSchema>;
export type ImplementationStatus = z.infer<typeof implementationStatusSchema>;
export type MoveId = z.infer<typeof moveIdSchema>;
