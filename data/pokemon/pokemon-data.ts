import type { PokemonSpecies } from "@/shared/types/pokemon";

export const POKEMON_DATA: PokemonSpecies[] = [
  {
    id: "pikachu",
    name: "Pikachu",
    description: "פוקימון חשמל מהיר וזריז.",
    dexNumber: 25,
    types: ["electric"],
    rarity: "rare",

    baseStats: {
      health: 35,
      attack: 55,
      defense: 40,
      specialAttack: 50,
      specialDefense: 50,
      speed: 90,
    },

    imageUrl: "/pokemon/pikachu.png",
  },
  {
    id: "bulbasaur",
    name: "Bulbasaur",
    description: "פוקימון זרע. אור השמש מזין את הזרע שעל גבו.",
    dexNumber: 1,
    types: ["grass", "poison"],
    rarity: "common",

    baseStats: {
      health: 45,
      attack: 49,
      defense: 49,
      specialAttack: 65,
      specialDefense: 65,
      speed: 45,
    },

    imageUrl: "/pokemon/bulbasaur.png",
    isStarter: true,
  },
  {
    id: "charmander",
    name: "Charmander",
    description: "פוקימון לטאה. הלהבה בקצה זנבו מסגירה את מצב רוחו.",
    dexNumber: 4,
    types: ["fire"],
    rarity: "common",

    baseStats: {
      health: 39,
      attack: 52,
      defense: 43,
      specialAttack: 60,
      specialDefense: 50,
      speed: 65,
    },

    imageUrl: "/pokemon/charmander.png",
    isStarter: true,
  },
  {
    id: "squirtle",
    name: "Squirtle",
    description: "פוקימון צב קטן. יורה מים בעוצמה רבה מתוך פיו.",
    dexNumber: 7,
    types: ["water"],
    rarity: "common",

    baseStats: {
      health: 44,
      attack: 48,
      defense: 65,
      specialAttack: 50,
      specialDefense: 64,
      speed: 43,
    },

    imageUrl: "/pokemon/squirtle.png",
    isStarter: true,
  },
];