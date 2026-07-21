import type { PokemonSpecies } from "@/shared/types/pokemon";

export const POKEMON_DATA: PokemonSpecies[] = [
  {
    id: "pikachu",
    name: "Pikachu",
    description: "פוקימון חשמל מהיר וזריז.",
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
];