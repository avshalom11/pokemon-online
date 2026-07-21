export type ItemCategory =
  | "pokeball"
  | "healing"
  | "battle"
  | "key-item";

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export interface Inventory {
  items: InventoryItem[];
}