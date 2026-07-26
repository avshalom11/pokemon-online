import { z } from "zod";

import { moveIdSchema } from "../../moves/index.ts";

// Permanent Pokémon species identifier — the same id shape (and the same
// values) as PokemonSpecies.id in shared/types/pokemon.ts / data/pokemon
// /pokemon-data.ts. Not re-derived from that module (there is no existing
// zod schema for it to import), but a species learnset is only ever valid
// if this id actually resolves in the species data — see
// validation/learnset-validation.ts for that referential check. Shape only
// here, same lowercase-kebab-case convention as moveIdSchema.
export const pokemonIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "pokemonId must be a lowercase kebab-case slug");

export const machineTypeSchema = z.enum(["tm", "hm"]);

// e.g. "tm24", "hm03" — a stable internal identifier, not the display
// label shown in any future Bag/inventory UI.
export const machineIdSchema = z
  .string()
  .regex(/^(tm|hm)\d{2,3}$/, 'machineId must look like "tm24" or "hm03"');

// A learnset entry can optionally be tagged with the game version group it
// applies to (e.g. "red-blue", "yellow", "firered-leafgreen"). Left as an
// open, shape-validated string rather than an enum: the set of version
// groups a future generation might introduce isn't known yet, and an enum
// here would need redesigning every time one is added — exactly what this
// field exists to avoid. Omitted entirely means "no version-specific
// distinction is known/needed for this entry".
export const versionGroupSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "versionGroup must be a lowercase kebab-case slug");

// How a Pokémon can learn a given move. Discriminated on `kind`, mirroring
// the move engine's MoveEffect convention — each variant carries only the
// fields that method actually needs, instead of one object with a pile of
// optional fields that are only meaningful for some methods.
export const learningMethodSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("level-up"),
    // Level 1 = available from the Pokémon's starting level; never 0.
    level: z.int().positive(),
  }),
  z
    .object({
      kind: z.literal("machine"),
      machineType: machineTypeSchema,
      machineId: machineIdSchema,
    })
    .check((ctx) => {
      const value = ctx.value;
      if (!value.machineId.startsWith(value.machineType)) {
        ctx.issues.push({
          code: "custom",
          message: `machineId "${value.machineId}" must start with machineType "${value.machineType}"`,
          path: ["machineId"],
          input: value.machineId,
        });
      }
    }),
  // Tutor/egg/special carry no fields yet. Adding one later (e.g. a tutor
  // source, an egg-parent species, an event name) is a backward-compatible
  // schema change — existing data with the field omitted stays valid.
  z.object({ kind: z.literal("tutor") }),
  z.object({ kind: z.literal("egg") }),
  z.object({ kind: z.literal("special") }),
]);

export const learnsetEntrySchema = z.object({
  moveId: moveIdSchema,
  method: learningMethodSchema,
  versionGroup: versionGroupSchema.optional(),
});

const baseGenerationSchema = z.int().positive();

export const pokemonLearnsetSchema = z
  .object({
    pokemonId: pokemonIdSchema,
    generation: baseGenerationSchema,
    entries: z.array(learnsetEntrySchema).min(1),
  })
  .check((ctx) => {
    const learnset = ctx.value;

    // Exact duplicate entries (same move, same method, same version group).
    const seenEntries = new Set<string>();
    learnset.entries.forEach((entry, index) => {
      const key = JSON.stringify([entry.moveId, entry.method, entry.versionGroup ?? null]);
      if (seenEntries.has(key)) {
        ctx.issues.push({
          code: "custom",
          message: `duplicate learnset entry for move "${entry.moveId}" (${entry.method.kind})`,
          path: ["entries", index],
          input: entry,
        });
      } else {
        seenEntries.add(key);
      }
    });

    // Contradictory level-up data: the same move can't require two
    // different levels within the same version group (or both unscoped).
    const levelByMoveAndVersion = new Map<string, number>();
    learnset.entries.forEach((entry, index) => {
      if (entry.method.kind !== "level-up") return;
      const key = `${entry.moveId}::${entry.versionGroup ?? ""}`;
      const existingLevel = levelByMoveAndVersion.get(key);
      if (existingLevel === undefined) {
        levelByMoveAndVersion.set(key, entry.method.level);
      } else if (existingLevel !== entry.method.level) {
        ctx.issues.push({
          code: "custom",
          message: `move "${entry.moveId}" is a level-up move at both level ${existingLevel} and level ${entry.method.level}${entry.versionGroup ? ` for versionGroup "${entry.versionGroup}"` : ""}`,
          path: ["entries", index, "method", "level"],
          input: entry.method.level,
        });
      }
    });
  });

export type MachineType = z.infer<typeof machineTypeSchema>;
export type LearningMethod = z.infer<typeof learningMethodSchema>;
export type LearnsetEntry = z.infer<typeof learnsetEntrySchema>;
export type PokemonLearnset = z.infer<typeof pokemonLearnsetSchema>;
export type PokemonLearnsetId = z.infer<typeof pokemonIdSchema>;
