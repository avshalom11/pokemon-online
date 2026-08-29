import { z } from "zod";

import { POKEMON_DATA } from "../../../data/pokemon/pokemon-data.ts";
import { getMoveById } from "../../moves/index.ts";
import { tmCompatibilityEntrySchema } from "../schemas/tm-compatibility-schema.ts";
import type { TmCompatibilityEntry } from "../types/tm-compatibility.types.ts";

export class TmCompatibilityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TmCompatibilityValidationError";
  }
}

function formatZodError(context: string, error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `  - ${path}: ${issue.message}`;
  });

  return [`${context}:`, ...lines].join("\n");
}

function isKnownPokemonId(pokemonId: string): boolean {
  return POKEMON_DATA.some((species) => species.id === pokemonId);
}

// Validates one entry's shape (via Zod) and then its referential integrity:
// pokemonId must resolve in the canonical species/form data, and every
// moveId must resolve in the real move registry — same two checks
// engine/learnsets' validateLearnset already makes for the exact same
// reasons. Throws TmCompatibilityValidationError naming the affected
// pokemonId/moveId on any failure — never silently accepts an unknown
// reference.
export function validateTmCompatibilityEntry(candidate: unknown): TmCompatibilityEntry {
  const result = tmCompatibilityEntrySchema.safeParse(candidate);

  if (!result.success) {
    const pokemonId =
      typeof candidate === "object" && candidate !== null && "pokemonId" in candidate
        ? String((candidate as { pokemonId?: unknown }).pokemonId)
        : "(unknown pokemonId)";

    throw new TmCompatibilityValidationError(formatZodError(`Invalid TM compatibility entry for "${pokemonId}"`, result.error));
  }

  const entry = result.data;

  if (!isKnownPokemonId(entry.pokemonId)) {
    throw new TmCompatibilityValidationError(
      `TM compatibility entry references unknown pokemonId "${entry.pokemonId}" (no matching species/form in the canonical Pokémon data)`
    );
  }

  const unknownMoveIds = entry.moveIds.filter((moveId) => getMoveById(moveId) === undefined);
  if (unknownMoveIds.length > 0) {
    throw new TmCompatibilityValidationError(
      `TM compatibility entry for pokemonId "${entry.pokemonId}" references unknown moveId(s): ${unknownMoveIds.join(", ")} (no matching move in the move registry)`
    );
  }

  return entry;
}

// Validates every entry in the list and asserts there is at most one entry
// per pokemonId across the whole set (the registry below is keyed by
// pokemonId alone). Collects every problem before throwing, the same
// "report everything wrong in one pass" convention validateLearnsetList and
// validateMoveList already establish.
export function validateTmCompatibilityList(candidates: readonly unknown[]): TmCompatibilityEntry[] {
  const problems: string[] = [];
  const validated: TmCompatibilityEntry[] = [];
  const seenPokemonIds = new Map<string, number>();

  candidates.forEach((candidate, index) => {
    try {
      const entry = validateTmCompatibilityEntry(candidate);
      validated.push(entry);

      const firstSeenAt = seenPokemonIds.get(entry.pokemonId);
      if (firstSeenAt !== undefined) {
        problems.push(
          `Duplicate TM compatibility entry for pokemonId "${entry.pokemonId}" at index ${index} (already defined at index ${firstSeenAt})`
        );
      } else {
        seenPokemonIds.set(entry.pokemonId, index);
      }
    } catch (error) {
      if (error instanceof TmCompatibilityValidationError) {
        problems.push(`[index ${index}] ${error.message}`);
      } else {
        throw error;
      }
    }
  });

  if (problems.length > 0) {
    throw new TmCompatibilityValidationError(
      [`TM compatibility list validation failed with ${problems.length} problem(s):`, ...problems].join("\n\n")
    );
  }

  return validated;
}
