import { z } from "zod";

import { POKEMON_DATA } from "../../../data/pokemon/pokemon-data.ts";
import { getMoveById } from "../../moves/index.ts";
import { pokemonLearnsetSchema } from "../schemas/learnset-schema.ts";
import type { PokemonLearnset } from "../types/learnset.types.ts";

export class LearnsetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearnsetValidationError";
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

// Validates one learnset's shape (via Zod) and then its referential
// integrity: the pokemonId must resolve in the canonical species data, and
// every moveId must resolve in the move registry. Throws
// LearnsetValidationError naming the affected pokemonId/moveId on any
// failure — never silently accepts an unknown reference.
export function validateLearnset(candidate: unknown): PokemonLearnset {
  const result = pokemonLearnsetSchema.safeParse(candidate);

  if (!result.success) {
    const pokemonId =
      typeof candidate === "object" && candidate !== null && "pokemonId" in candidate
        ? String((candidate as { pokemonId?: unknown }).pokemonId)
        : "(unknown pokemonId)";

    throw new LearnsetValidationError(formatZodError(`Invalid learnset for "${pokemonId}"`, result.error));
  }

  const learnset = result.data;

  if (!isKnownPokemonId(learnset.pokemonId)) {
    throw new LearnsetValidationError(
      `Learnset references unknown pokemonId "${learnset.pokemonId}" (no matching species in the canonical Pokémon data)`
    );
  }

  const unknownMoveIds = [...new Set(learnset.entries.map((entry) => entry.moveId))].filter(
    (moveId) => getMoveById(moveId) === undefined
  );

  if (unknownMoveIds.length > 0) {
    throw new LearnsetValidationError(
      `Learnset for pokemonId "${learnset.pokemonId}" references unknown moveId(s): ${unknownMoveIds.join(", ")} (no matching move in the move registry)`
    );
  }

  return learnset;
}

// Validates every learnset in a list and asserts there is at most one
// learnset per pokemonId across the whole set (the registry is keyed by
// pokemonId alone — see registry/learnset-registry.ts). Collects every
// problem before throwing, the same as validateMoveList.
export function validateLearnsetList(candidates: readonly unknown[]): PokemonLearnset[] {
  const problems: string[] = [];
  const validated: PokemonLearnset[] = [];
  const seenPokemonIds = new Map<string, number>();

  candidates.forEach((candidate, index) => {
    try {
      const learnset = validateLearnset(candidate);
      validated.push(learnset);

      const firstSeenAt = seenPokemonIds.get(learnset.pokemonId);
      if (firstSeenAt !== undefined) {
        problems.push(
          `Duplicate learnset for pokemonId "${learnset.pokemonId}" at index ${index} (already defined at index ${firstSeenAt})`
        );
      } else {
        seenPokemonIds.set(learnset.pokemonId, index);
      }
    } catch (error) {
      if (error instanceof LearnsetValidationError) {
        problems.push(`[index ${index}] ${error.message}`);
      } else {
        throw error;
      }
    }
  });

  if (problems.length > 0) {
    throw new LearnsetValidationError(
      [`Learnset list validation failed with ${problems.length} problem(s):`, ...problems].join("\n\n")
    );
  }

  return validated;
}
