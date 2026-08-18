import type { GymBattleSlotId } from "../types/gym.types";
import type { GymNpcTeamDefinition } from "../types/npc-team.types";
import type { RegionId } from "@/shared/types/region";

// GYMS & LEAGUES PHASE 2 — GENERATED, checked-in fixed data. Produced by
// scripts/generate-gym-npc-teams.ts — do not hand-edit; re-run the
// generator instead. See npc-team-selection.ts for the selection algorithm
// this data was produced by, and npc-team-preferences.ts for the "previous
// design" hints it was seeded with.

export const GYM_NPC_TEAMS: readonly GymNpcTeamDefinition[] = [
  {
    "regionId": "kanto",
    "gymNumber": 1,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "pidgey",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "pidgeotto",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "pidgeot",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "kanto",
    "gymNumber": 1,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "rattata",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "farfetchd",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "lickitung",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "kangaskhan",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "kanto",
    "gymNumber": 1,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "tauros",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "ditto",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "bulbasaur",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "ivysaur",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "venusaur",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "articuno",
        "targetRarity": "legendary",
        "fallbackTier": "legendary-same-region-off-type"
      }
    ]
  },
  {
    "regionId": "kanto",
    "gymNumber": 2,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "vulpix",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "growlithe",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "ninetales",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "kanto",
    "gymNumber": 2,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "ponyta",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "arcanine",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "rapidash",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "magmar",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "kanto",
    "gymNumber": 2,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "beedrill",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "pidgeot",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "charizard",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "flareon",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "charmander",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "moltres",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "kanto",
    "gymNumber": 3,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "psyduck",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "golduck",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "poliwrath",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "kanto",
    "gymNumber": 3,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "poliwag",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "staryu",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "starmie",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "gyarados",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "kanto",
    "gymNumber": 3,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "lapras",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "omanyte",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "squirtle",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "wartortle",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "blastoise",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "articuno",
        "targetRarity": "legendary",
        "fallbackTier": "legendary-same-region-off-type"
      }
    ]
  },
  {
    "regionId": "johto",
    "gymNumber": 1,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "chinchou",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "pichu",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "lanturn",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "johto",
    "gymNumber": 1,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "mareep",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "ampharos",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "noctowl",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "crobat",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      }
    ]
  },
  {
    "regionId": "johto",
    "gymNumber": 1,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "togetic",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "xatu",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "chikorita",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "bayleef",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "meganium",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "raikou",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "johto",
    "gymNumber": 2,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "hoppip",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "skiploom",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "bellossom",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "johto",
    "gymNumber": 2,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "sunkern",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "jumpluff",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "sunflora",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "noctowl",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      }
    ]
  },
  {
    "regionId": "johto",
    "gymNumber": 2,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "crobat",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "lanturn",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "chikorita",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "bayleef",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "meganium",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "celebi",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "johto",
    "gymNumber": 3,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "sneasel",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "swinub",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "piloswine",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "johto",
    "gymNumber": 3,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "smoochum",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "delibird",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "noctowl",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "crobat",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      }
    ]
  },
  {
    "regionId": "johto",
    "gymNumber": 3,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "lanturn",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "togetic",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "chikorita",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "bayleef",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "meganium",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "raikou",
        "targetRarity": "legendary",
        "fallbackTier": "legendary-same-region-off-type"
      }
    ]
  },
  {
    "regionId": "hoenn",
    "gymNumber": 1,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "makuhita",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "meditite",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "breloom",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "hoenn",
    "gymNumber": 1,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "poochyena",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "hariyama",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "medicham",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "mightyena",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      }
    ]
  },
  {
    "regionId": "hoenn",
    "gymNumber": 1,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "linoone",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "beautifly",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "combusken",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "blaziken",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "treecko",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "regirock",
        "targetRarity": "legendary",
        "fallbackTier": "legendary-same-region-off-type"
      }
    ]
  },
  {
    "regionId": "hoenn",
    "gymNumber": 2,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "gulpin",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "poochyena",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "dustox",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "hoenn",
    "gymNumber": 2,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "zigzagoon",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "roselia",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "swalot",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "seviper",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "hoenn",
    "gymNumber": 2,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "mightyena",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "linoone",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "treecko",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "grovyle",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "sceptile",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "regirock",
        "targetRarity": "legendary",
        "fallbackTier": "legendary-same-region-off-type"
      }
    ]
  },
  {
    "regionId": "hoenn",
    "gymNumber": 3,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "nincada",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "numel",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "camerupt",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "hoenn",
    "gymNumber": 3,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "trapinch",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "flygon",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "whiscash",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "claydol",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "hoenn",
    "gymNumber": 3,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "mightyena",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "linoone",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "marshtomp",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "swampert",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "treecko",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "groudon",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "sinnoh",
    "gymNumber": 1,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "starly",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "staravia",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "staraptor",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "sinnoh",
    "gymNumber": 1,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "combee",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "mothim",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "vespiquen",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "drifblim",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "sinnoh",
    "gymNumber": 1,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "honchkrow",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "chatot",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "typhlosion-hisui",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "turtwig",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "grotle",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "rotom-fan",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "sinnoh",
    "gymNumber": 2,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "chingling",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "bronzor",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "bronzong",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "sinnoh",
    "gymNumber": 2,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "mime-jr",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "gallade",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "braviary-hisui",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "wyrdeer",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "sinnoh",
    "gymNumber": 2,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "arcanine-hisui",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "qwilfish-hisui",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "typhlosion-hisui",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "turtwig",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "grotle",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "uxie",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "sinnoh",
    "gymNumber": 3,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "kricketot",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "burmy",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "kricketune",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "sinnoh",
    "gymNumber": 3,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "combee",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "wormadam",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "mothim",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "vespiquen",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "sinnoh",
    "gymNumber": 3,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "yanmega",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "arcanine-hisui",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "kleavor",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "typhlosion-hisui",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "turtwig",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "rotom",
        "targetRarity": "legendary",
        "fallbackTier": "legendary-same-region-off-type"
      }
    ]
  },
  {
    "regionId": "unova",
    "gymNumber": 1,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "roggenrola",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "boldore",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "gigalith",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "unova",
    "gymNumber": 1,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "dwebble",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "crustle",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "carracosta",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "archeops",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "unova",
    "gymNumber": 1,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "watchog",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "stoutland",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "snivy",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "servine",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "serperior",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "terrakion",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "unova",
    "gymNumber": 2,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "yamask",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "frillish",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "cofagrigus",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "unova",
    "gymNumber": 2,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "litwick",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "jellicent",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "chandelure",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "golurk",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "unova",
    "gymNumber": 2,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "watchog",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "stoutland",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "snivy",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "servine",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "serperior",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "victini",
        "targetRarity": "legendary",
        "fallbackTier": "legendary-same-region-off-type"
      }
    ]
  },
  {
    "regionId": "unova",
    "gymNumber": 3,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "axew",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "fraxure",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "haxorus",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "unova",
    "gymNumber": 3,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "patrat",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "druddigon",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "watchog",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "stoutland",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      }
    ]
  },
  {
    "regionId": "unova",
    "gymNumber": 3,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "liepard",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "simisage",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "deino",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "zweilous",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "hydreigon",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "reshiram",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "kalos",
    "gymNumber": 1,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "inkay",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "bunnelby",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "pangoro",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "kalos",
    "gymNumber": 1,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "fletchling",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "malamar",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "diggersby",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "talonflame",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      }
    ]
  },
  {
    "regionId": "kalos",
    "gymNumber": 1,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "vivillon",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "pyroar",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "greninja",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "chespin",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "quilladin",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "yveltal",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "kalos",
    "gymNumber": 2,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "honedge",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "doublade",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "aegislash",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "kalos",
    "gymNumber": 2,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "bunnelby",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "klefki",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "diggersby",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "talonflame",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      }
    ]
  },
  {
    "regionId": "kalos",
    "gymNumber": 2,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "vivillon",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "pyroar",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "chespin",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "quilladin",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "chesnaught",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "xerneas",
        "targetRarity": "legendary",
        "fallbackTier": "legendary-same-region-off-type"
      }
    ]
  },
  {
    "regionId": "kalos",
    "gymNumber": 3,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "flabebe",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "floette",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "florges",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "kalos",
    "gymNumber": 3,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "spritzee",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "aromatisse",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "slurpuff",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "sylveon",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "kalos",
    "gymNumber": 3,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "dedenne",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "carbink",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "chespin",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "quilladin",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "chesnaught",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "xerneas",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "alola",
    "gymNumber": 1,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "rattata-alola",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "pikipek",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "raticate-alola",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "alola",
    "gymNumber": 1,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "yungoos",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "trumbeak",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "toucannon",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "gumshoos",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "alola",
    "gymNumber": 1,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "oranguru",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "silvally",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "raichu-alola",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "golem-alola",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "marowak-alola",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "tapu-koko",
        "targetRarity": "legendary",
        "fallbackTier": "legendary-same-region-off-type"
      }
    ]
  },
  {
    "regionId": "alola",
    "gymNumber": 2,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "geodude-alola",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "graveler-alola",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "vikavolt",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "alola",
    "gymNumber": 2,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "charjabug",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "raticate-alola",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "ninetales-alola",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "muk-alola",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      }
    ]
  },
  {
    "regionId": "alola",
    "gymNumber": 2,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "trumbeak",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "toucannon",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "raichu-alola",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "golem-alola",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "marowak-alola",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "tapu-koko",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "alola",
    "gymNumber": 3,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "stufful",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "bewear",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "crabrawler",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "alola",
    "gymNumber": 3,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "rattata-alola",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "crabominable",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "passimian",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "raticate-alola",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      }
    ]
  },
  {
    "regionId": "alola",
    "gymNumber": 3,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "ninetales-alola",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "muk-alola",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "hakamo-o",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "kommo-o",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "raichu-alola",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "buzzwole",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "galar",
    "gymNumber": 1,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "carkol",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "sizzlipede",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "coalossal",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "galar",
    "gymNumber": 1,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "meowth-galar",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "centiskorch",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "rapidash-galar",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "farfetchd-galar",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      }
    ]
  },
  {
    "regionId": "galar",
    "gymNumber": 1,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "mr-mime-galar",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "slowking-galar",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "scorbunny",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "raboot",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "cinderace",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "articuno-galar",
        "targetRarity": "legendary",
        "fallbackTier": "legendary-same-region-off-type"
      }
    ]
  },
  {
    "regionId": "galar",
    "gymNumber": 2,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "chewtle",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "arrokuda",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "drednaw",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "galar",
    "gymNumber": 2,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "meowth-galar",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "cramorant",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "barraskewda",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "dracovish",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "galar",
    "gymNumber": 2,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "arctovish",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "rapidash-galar",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "sobble",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "drizzile",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "inteleon",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "articuno-galar",
        "targetRarity": "legendary",
        "fallbackTier": "legendary-same-region-off-type"
      }
    ]
  },
  {
    "regionId": "galar",
    "gymNumber": 3,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "gossifleur",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "applin",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "eldegoss",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "galar",
    "gymNumber": 3,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "meowth-galar",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "flapple",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "appletun",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "rapidash-galar",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      }
    ]
  },
  {
    "regionId": "galar",
    "gymNumber": 3,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "farfetchd-galar",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "mr-mime-galar",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "grookey",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "thwackey",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "rillaboom",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "zarude",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "paldea",
    "gymNumber": 1,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "flittle",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "wooper-paldea",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "rabsca",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "paldea",
    "gymNumber": 1,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "lechonk",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "espathra",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "veluza",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "farigiraf",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "paldea",
    "gymNumber": 1,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "tauros-paldea-combat",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "tauros-paldea-blaze",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "armarouge",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "scream-tail",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "sprigatito",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "iron-leaves",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "paldea",
    "gymNumber": 2,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "maschiff",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "wooper-paldea",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "lokix",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "paldea",
    "gymNumber": 2,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "lechonk",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "mabosstiff",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "bombirdier",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "kingambit",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "paldea",
    "gymNumber": 2,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "tauros-paldea-combat",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "tauros-paldea-blaze",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "meowscarada",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "brute-bonnet",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "iron-jugulis",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "wo-chien",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "paldea",
    "gymNumber": 3,
    "battleSlot": "easy",
    "members": [
      {
        "speciesId": "dipplin",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "wooper-paldea",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "cyclizar",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  },
  {
    "regionId": "paldea",
    "gymNumber": 3,
    "battleSlot": "medium",
    "members": [
      {
        "speciesId": "lechonk",
        "targetRarity": "common",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "tatsugiri",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "hydrapple",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "tauros-paldea-combat",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      }
    ]
  },
  {
    "regionId": "paldea",
    "gymNumber": 3,
    "battleSlot": "leader",
    "members": [
      {
        "speciesId": "tauros-paldea-blaze",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "tauros-paldea-aqua",
        "targetRarity": "rare",
        "fallbackTier": "exact-rarity-off-type"
      },
      {
        "speciesId": "frigibax",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "arctibax",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "baxcalibur",
        "targetRarity": "very-rare",
        "fallbackTier": "exact-rarity-matching-type"
      },
      {
        "speciesId": "koraidon",
        "targetRarity": "legendary",
        "fallbackTier": "exact-rarity-matching-type"
      }
    ]
  }
];

export function getGymNpcTeam(regionId: RegionId, gymNumber: 1 | 2 | 3, battleSlot: GymBattleSlotId): GymNpcTeamDefinition | undefined {
  return GYM_NPC_TEAMS.find((team) => team.regionId === regionId && team.gymNumber === gymNumber && team.battleSlot === battleSlot);
}
