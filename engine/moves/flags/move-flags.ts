import { z } from "zod";

// Reusable move flags. A flag describes a property of a move that other
// systems (abilities, protect, sound-immunity, etc.) key off of, instead of
// each of those systems special-casing move IDs. Add new flags here as
// future mechanics need them — nothing else in the move engine needs to
// change to support a new flag.
export const ALL_MOVE_FLAGS = [
  "makesContact",
  "protectable",
  "mirrorMove",
  "soundBased",
  "biting",
  "punching",
  "slicing",
] as const;

export type MoveFlag = (typeof ALL_MOVE_FLAGS)[number];

export const moveFlagSchema = z.enum(ALL_MOVE_FLAGS);
