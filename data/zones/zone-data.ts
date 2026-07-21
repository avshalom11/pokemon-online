import type { Zone } from "@/shared/types/zone";

export const ZONE_DATA: Zone[] = [
  {
    id: "grassland",
    name: "אזור הדשא",
    description: "מרחבים ירוקים שבהם חיים פוקימונים נפוצים.",
    imageUrl: "/zones/grassland.png",

    recommendedTypes: ["grass", "electric"],

    encounters: [
      {
        pokemonId: "pikachu",
        minimumLevel: 3,
        maximumLevel: 6,
        encounterWeight: 10,
      },
    ],
  },
  {
    id: "water",
    name: "אזור המים",
    description: "מרחבי מים שקטים שבהם מסתתרים פוקימונים.",
    imageUrl: "/zones/water.png",

    encounters: [
      {
        pokemonId: "pikachu",
        minimumLevel: 3,
        maximumLevel: 6,
        encounterWeight: 10,
      },
    ],
  },
  {
    id: "cave",
    name: "אזור המערה",
    description: "מערה חשוכה שבה מסתתרים פוקימונים נדירים.",
    imageUrl: "/zones/cave.png",

    encounters: [
      {
        pokemonId: "pikachu",
        minimumLevel: 3,
        maximumLevel: 6,
        encounterWeight: 10,
      },
    ],
  },
  {
    id: "lava",
    name: "אזור הלבה",
    description: "אזור געשי מסוכן שבו חיים פוקימונים חזקים.",
    imageUrl: "/zones/lava.png",

    encounters: [
      {
        pokemonId: "pikachu",
        minimumLevel: 3,
        maximumLevel: 6,
        encounterWeight: 10,
      },
    ],
  },
  {
    id: "beach",
    name: "אזור החוף",
    description: "חוף שקט שבו מסתתרים פוקימונים ידידותיים.",
    imageUrl: "/zones/beach.png",

    encounters: [
      {
        pokemonId: "pikachu",
        minimumLevel: 3,
        maximumLevel: 6,
        encounterWeight: 10,
      },
    ],
  },
  {
    id: "haunted-house",
    name: "בית הרוחות",
    description: "בית נטוש שבו מסתתרים פוקימוני רוח.",
    imageUrl: "/zones/haunted-house.png",

    encounters: [
      {
        pokemonId: "pikachu",
        minimumLevel: 3,
        maximumLevel: 6,
        encounterWeight: 10,
      },
    ],
  },
];