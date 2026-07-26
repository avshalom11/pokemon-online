// Compile-time-only checks for the learnset engine's public types. This
// file is never imported or executed — `npx tsc --noEmit` is what
// exercises it, the same way engine/moves/types/move.types.typecheck.ts
// exercises the move engine's types. A broken type change should fail the
// build here before it fails anywhere else.
import type { LearningMethod, PokemonLearnset } from "./learnset.types.ts";

// A fully valid PokemonLearnset literal must type-check with no errors.
const validLearnset: PokemonLearnset = {
  pokemonId: "bulbasaur",
  generation: 1,
  entries: [
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "razor-leaf", method: { kind: "machine", machineType: "tm", machineId: "tm22" } },
    { moveId: "swords-dance", method: { kind: "tutor" } },
    { moveId: "amnesia", method: { kind: "egg" } },
    { moveId: "transform", method: { kind: "special" } },
    { moveId: "vine-whip", method: { kind: "level-up", level: 13 }, versionGroup: "red-blue" },
  ],
};
void validLearnset;

// @ts-expect-error — "level-up" requires a `level`, not a `machineId`.
const invalidLevelUp: LearningMethod = { kind: "level-up", machineId: "tm01" };
void invalidLevelUp;

// @ts-expect-error — "tutor" carries no fields; `level` doesn't belong here.
const invalidTutor: LearningMethod = { kind: "tutor", level: 5 };
void invalidTutor;

// @ts-expect-error — kind must be one of the five known methods.
const invalidKind: LearningMethod = { kind: "trade" };
void invalidKind;

// Narrowing on `kind` must give each variant its own fields.
function describeMethod(method: LearningMethod): string {
  switch (method.kind) {
    case "level-up":
      // Only reachable here because the discriminant narrowed the union.
      return `level ${method.level}`;
    case "machine":
      return `${method.machineType} ${method.machineId}`;
    case "tutor":
    case "egg":
    case "special":
      return method.kind;
  }
}
void describeMethod;

// @ts-expect-error — machineType must be "tm" | "hm", not an arbitrary string.
const invalidMachineType: LearningMethod = { kind: "machine", machineType: "cd", machineId: "cd01" };
void invalidMachineType;
