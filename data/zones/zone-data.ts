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
];