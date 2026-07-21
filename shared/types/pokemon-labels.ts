import type {
  PokemonRarity,
  PokemonType,
} from "./pokemon";

export const POKEMON_RARITY_LABELS: Record<PokemonRarity, string> = {
  common: "נפוץ",
  rare: "נדיר",
  "very-rare": "נדיר מאוד",
  legendary: "אגדי",
};

export const POKEMON_TYPE_LABELS: Record<PokemonType, string> = {
  normal: "רגיל",
  fire: "אש",
  water: "מים",
  electric: "חשמל",
  grass: "עשב",
  ice: "קרח",
  fighting: "לחימה",
  poison: "רעל",
  ground: "אדמה",
  flying: "מעופף",
  psychic: "על־חושי",
  bug: "חרק",
  rock: "סלע",
  ghost: "רוח",
  dragon: "דרקון",
  dark: "אופל",
  steel: "פלדה",
  fairy: "פיה",
};