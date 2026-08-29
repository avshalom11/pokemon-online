import { z } from "zod";

import { pokemonIdSchema } from "../../learnsets/index.ts";
import { moveIdSchema } from "../../moves/index.ts";

// A stable machine identifier — always "tm-<moveId>" (e.g. "tm-thunderbolt"),
// deliberately never a numeric TM slot ("tm24"): this project's own product
// rule (features/tm-system's "no generation-specific TM numbers"). Every
// compatibility fact this engine stores implicitly corresponds to exactly
// one of these — see toTmMachineId in ../queries/tm-compatibility-queries.ts,
// the one place that derives it (never hand-typed or stored redundantly
// alongside every entry below).
export const tmMachineIdSchema = z
  .string()
  .regex(/^tm-[a-z0-9]+(-[a-z0-9]+)*$/, 'machineId must look like "tm-<moveId>", never a numeric TM number');

// One species/form's full machine (TM/TR) compatibility for this project's
// TM moves — grouped by pokemonId rather than one row per (pokemonId,
// moveId) pair purely for file size/readability (a flat one-row-per-pair
// shape would be ~13,000 near-duplicate objects); the semantic unit
// canLearnTm actually checks is still a single (pokemonId, moveId) pair.
//
// pokemonId is the exact same species/form id every other system in this
// codebase already keys by (PlayerPokemon.speciesId, PokemonLearnset.
// pokemonId, ...) — an alternate form (e.g. "deoxys-attack") is its own
// pokemonId, entirely independent of its base form's own compatibility.
export const tmCompatibilityEntrySchema = z
  .object({
    pokemonId: pokemonIdSchema,
    moveIds: z.array(moveIdSchema).min(1),
  })
  .check((ctx) => {
    const entry = ctx.value;
    const uniqueMoveIds = new Set(entry.moveIds);
    if (uniqueMoveIds.size !== entry.moveIds.length) {
      ctx.issues.push({
        code: "custom",
        message: `pokemonId "${entry.pokemonId}" has a duplicate moveId in its compatibility list`,
        path: ["moveIds"],
        input: entry.moveIds,
      });
    }
  });

export type TmMachineId = z.infer<typeof tmMachineIdSchema>;
export type TmCompatibilityEntry = z.infer<typeof tmCompatibilityEntrySchema>;
