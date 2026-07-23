import type { Zone } from "@/shared/types/zone";

// Encounter weights (Milestone 8): common species carry high weights, rare
// species medium, very-rare low. Starters may appear in their thematic
// zone but always at a low weight, so they read as a rare special find
// despite their catalog `rarity` staying "common" (that field is the
// species' permanent classification, independent of how often a specific
// zone rolls it). Every entry's pokemonId belongs only to that zone's own
// roster, so startPokemonEncounter can never cross zones (e.g. a Cave roll
// can never select a Beach-only species) — nothing beyond correct data
// here is required to guarantee that.
export const ZONE_DATA: Zone[] = [
  {
    id: "grassland",
    name: "אזור הדשא",
    description: "מרחבים ירוקים שבהם חיים פוקימונים נפוצים.",
    imageUrl: "/zones/grassland.png",

    recommendedTypes: ["grass", "electric"],

    encounters: [
      { pokemonId: "bulbasaur", minimumLevel: 5, maximumLevel: 7, encounterWeight: 5 },
      { pokemonId: "caterpie", minimumLevel: 2, maximumLevel: 5, encounterWeight: 22 },
      { pokemonId: "weedle", minimumLevel: 2, maximumLevel: 5, encounterWeight: 22 },
      { pokemonId: "oddish", minimumLevel: 3, maximumLevel: 6, encounterWeight: 15 },
    ],
  },
  {
    id: "water",
    name: "אזור המים",
    description: "מרחבי מים שקטים שבהם מסתתרים פוקימונים.",
    imageUrl: "/zones/water.png",

    encounters: [
      { pokemonId: "squirtle", minimumLevel: 5, maximumLevel: 7, encounterWeight: 5 },
      { pokemonId: "psyduck", minimumLevel: 2, maximumLevel: 5, encounterWeight: 20 },
      { pokemonId: "poliwag", minimumLevel: 2, maximumLevel: 5, encounterWeight: 20 },
      { pokemonId: "magikarp", minimumLevel: 2, maximumLevel: 5, encounterWeight: 25 },
    ],
  },
  {
    id: "cave",
    name: "אזור המערה",
    description: "מערה חשוכה שבה מסתתרים פוקימונים נדירים.",
    imageUrl: "/zones/cave.png",

    encounters: [
      { pokemonId: "zubat", minimumLevel: 3, maximumLevel: 6, encounterWeight: 22 },
      { pokemonId: "geodude", minimumLevel: 3, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "onix", minimumLevel: 5, maximumLevel: 8, encounterWeight: 8 },
    ],
  },
  {
    id: "lava",
    name: "אזור הלבה",
    description: "אזור געשי מסוכן שבו חיים פוקימונים חזקים.",
    imageUrl: "/zones/lava.png",

    encounters: [
      { pokemonId: "charmander", minimumLevel: 5, maximumLevel: 7, encounterWeight: 5 },
      { pokemonId: "growlithe", minimumLevel: 4, maximumLevel: 7, encounterWeight: 12 },
      { pokemonId: "ponyta", minimumLevel: 4, maximumLevel: 7, encounterWeight: 10 },
    ],
  },
  {
    id: "beach",
    name: "אזור החוף",
    description: "חוף שקט שבו מסתתרים פוקימונים ידידותיים.",
    imageUrl: "/zones/beach.png",

    encounters: [
      { pokemonId: "tentacool", minimumLevel: 2, maximumLevel: 5, encounterWeight: 22 },
      { pokemonId: "krabby", minimumLevel: 2, maximumLevel: 5, encounterWeight: 20 },
      { pokemonId: "shellder", minimumLevel: 3, maximumLevel: 6, encounterWeight: 18 },
    ],
  },
  {
    id: "haunted-house",
    name: "בית הרוחות",
    description: "בית נטוש שבו מסתתרים פוקימוני רוח.",
    imageUrl: "/zones/haunted-house.png",

    encounters: [
      { pokemonId: "gastly", minimumLevel: 4, maximumLevel: 7, encounterWeight: 14 },
      { pokemonId: "haunter", minimumLevel: 6, maximumLevel: 9, encounterWeight: 5 },
      { pokemonId: "cubone", minimumLevel: 4, maximumLevel: 7, encounterWeight: 12 },
    ],
  },
];
