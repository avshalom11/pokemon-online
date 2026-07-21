import type { PokemonType } from "./pokemon";

export type MoveCategory =
  | "physical"
  | "special"
  | "status";

export interface Move {
  id: string;
  name: string;
  description: string;

  type: PokemonType;
  category: MoveCategory;

  power: number | null;
  accuracy: number;
  maxUses: number;

  priority: number;
}