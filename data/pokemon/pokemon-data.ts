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
    rarity: "very-rare",

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
    rarity: "very-rare",

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
    rarity: "very-rare",

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

  // --- Zone roster expansion (Milestone 7) ---------------------------
  // Grass zone
  {
    id: "caterpie",
    name: "Caterpie",
    description: "פוקימון זחל. תיאבונו האדיר גורם לו לגדול במהירות.",
    dexNumber: 10,
    types: ["bug"],
    rarity: "common",
    baseStats: { health: 45, attack: 30, defense: 35, specialAttack: 20, specialDefense: 20, speed: 45 },
    imageUrl: "/pokemon/caterpie.png",
  },
  {
    id: "weedle",
    name: "Weedle",
    description: "פוקימון חרק עם עוקץ חד על ראשו, מתחבא בין העלים.",
    dexNumber: 13,
    types: ["bug", "poison"],
    rarity: "common",
    baseStats: { health: 40, attack: 35, defense: 30, specialAttack: 20, specialDefense: 20, speed: 50 },
    imageUrl: "/pokemon/weedle.png",
  },
  {
    id: "oddish",
    name: "Oddish",
    description: "פוקימון עשב-רעל שנטמן באדמה ביום וזוחל בלילה.",
    dexNumber: 43,
    types: ["grass", "poison"],
    rarity: "common",
    baseStats: { health: 45, attack: 50, defense: 55, specialAttack: 75, specialDefense: 65, speed: 30 },
    imageUrl: "/pokemon/oddish.png",
  },

  // Water zone
  {
    id: "psyduck",
    name: "Psyduck",
    description: "פוקימון תמיד סובל מכאב ראש, מה שמסתיר כוחות נפשיים נסתרים.",
    dexNumber: 54,
    types: ["water"],
    rarity: "common",
    baseStats: { health: 50, attack: 52, defense: 48, specialAttack: 65, specialDefense: 50, speed: 55 },
    imageUrl: "/pokemon/psyduck.png",
  },
  {
    id: "poliwag",
    name: "Poliwag",
    description: "פוקימון ראשן. עורו הדק שקוף דיו כדי לראות דרכו את איבריו הפנימיים.",
    dexNumber: 60,
    types: ["water"],
    rarity: "common",
    baseStats: { health: 40, attack: 50, defense: 40, specialAttack: 40, specialDefense: 40, speed: 90 },
    imageUrl: "/pokemon/poliwag.png",
  },
  {
    id: "magikarp",
    name: "Magikarp",
    description: "פוקימון דג חלש כמעט בכל תחום, אך נפוץ מאוד במקורות מים.",
    dexNumber: 129,
    types: ["water"],
    rarity: "common",
    baseStats: { health: 20, attack: 10, defense: 55, specialAttack: 15, specialDefense: 20, speed: 80 },
    imageUrl: "/pokemon/magikarp.png",
  },

  // Cave zone
  {
    id: "zubat",
    name: "Zubat",
    description: "פוקימון עטלף שחי במערות חשוכות ומנווט באמצעות גלי קול.",
    dexNumber: 41,
    types: ["poison", "flying"],
    rarity: "common",
    baseStats: { health: 40, attack: 45, defense: 35, specialAttack: 30, specialDefense: 40, speed: 55 },
    imageUrl: "/pokemon/zubat.png",
  },
  {
    id: "geodude",
    name: "Geodude",
    description: "פוקימון עשוי סלע, נמצא לרוב על שבילי הרים ומתחפש לאבן.",
    dexNumber: 74,
    types: ["rock", "ground"],
    rarity: "common",
    baseStats: { health: 40, attack: 80, defense: 100, specialAttack: 30, specialDefense: 30, speed: 20 },
    imageUrl: "/pokemon/geodude.png",
  },
  {
    id: "onix",
    name: "Onix",
    description: "פוקימון נחש-סלע ענק שחופר במהירות אדירה מתחת לאדמה.",
    dexNumber: 95,
    types: ["rock", "ground"],
    rarity: "rare",
    baseStats: { health: 35, attack: 45, defense: 160, specialAttack: 30, specialDefense: 45, speed: 70 },
    imageUrl: "/pokemon/onix.png",
  },

  // Lava zone
  {
    id: "growlithe",
    name: "Growlithe",
    description: "פוקימון כלב אש נאמן, נובח בקול רם כדי להזהיר מפני סכנה.",
    dexNumber: 58,
    types: ["fire"],
    rarity: "common",
    baseStats: { health: 55, attack: 70, defense: 45, specialAttack: 70, specialDefense: 50, speed: 60 },
    imageUrl: "/pokemon/growlithe.png",
  },
  {
    id: "ponyta",
    name: "Ponyta",
    description: "פוקימון סוס אש שרעמתו בוערת ומתחזקת ככל שהוא מתרגש.",
    dexNumber: 77,
    types: ["fire"],
    rarity: "common",
    baseStats: { health: 50, attack: 85, defense: 55, specialAttack: 65, specialDefense: 65, speed: 90 },
    imageUrl: "/pokemon/ponyta.png",
  },

  // Beach zone
  {
    id: "tentacool",
    name: "Tentacool",
    description: "פוקימון מדוזה הצף בשקט ליד החוף, אך זרועותיו עלולות לצרוב.",
    dexNumber: 72,
    types: ["water", "poison"],
    rarity: "common",
    baseStats: { health: 40, attack: 40, defense: 35, specialAttack: 50, specialDefense: 100, speed: 70 },
    imageUrl: "/pokemon/tentacool.png",
  },
  {
    id: "krabby",
    name: "Krabby",
    description: "פוקימון סרטן עם צבתות חזקות שיכולות לגדול מחדש אם נשברות.",
    dexNumber: 98,
    types: ["water"],
    rarity: "common",
    baseStats: { health: 30, attack: 105, defense: 90, specialAttack: 25, specialDefense: 25, speed: 50 },
    imageUrl: "/pokemon/krabby.png",
  },
  {
    id: "shellder",
    name: "Shellder",
    description: "פוקימון צדפה עם קונכייה קשה כיהלום, שוכן בקרקעית הים.",
    dexNumber: 90,
    types: ["water"],
    rarity: "common",
    baseStats: { health: 30, attack: 65, defense: 100, specialAttack: 45, specialDefense: 25, speed: 40 },
    imageUrl: "/pokemon/shellder.png",
  },

  // Ghost House zone
  {
    id: "gastly",
    name: "Gastly",
    description: "פוקימון עשוי גז רעיל, כמעט בלתי נראה ומקיף כל מי שמתקרב.",
    dexNumber: 92,
    types: ["ghost", "poison"],
    rarity: "common",
    baseStats: { health: 30, attack: 35, defense: 30, specialAttack: 100, specialDefense: 35, speed: 80 },
    imageUrl: "/pokemon/gastly.png",
  },
  {
    id: "haunter",
    name: "Haunter",
    description: "פוקימון רוח שמסתתר בצללים ואוהב ללקק את קורבנותיו.",
    dexNumber: 93,
    types: ["ghost", "poison"],
    rarity: "common",
    baseStats: { health: 45, attack: 50, defense: 45, specialAttack: 115, specialDefense: 55, speed: 95 },
    imageUrl: "/pokemon/haunter.png",
  },
  {
    id: "cubone",
    name: "Cubone",
    description: "פוקימון בודד שעונד גולגולת על ראשו ובוכה בלילות ירח מלא.",
    dexNumber: 104,
    types: ["ground"],
    rarity: "common",
    baseStats: { health: 50, attack: 50, defense: 95, specialAttack: 40, specialDefense: 50, speed: 35 },
    imageUrl: "/pokemon/cubone.png",
  },
  // --- Generation 1 completeness (Phase 4B) ------------------------
  // The remaining Generation 1 species (Bulbapedia/Showdown dex #1-151),
  // sourced from Pokémon Showdown pokedex.ts for dexNumber/types/baseStats.
  // Not yet placed in any zone encounter table -- that stays a separate,
  // deliberate change; this only makes every species referenceable (e.g.
  // by engine/learnsets) via getSpeciesById.

  {
    id: "ivysaur",
    name: "Ivysaur",
    description: "פוקימון זרע. הניצן שעל גבו גדל ואוגר אנרגיה לקראת הפריחה הגדולה.",
    dexNumber: 2,
    types: ["grass", "poison"],
    rarity: "very-rare",

    baseStats: {
      health: 60,
      attack: 62,
      defense: 63,
      specialAttack: 80,
      specialDefense: 80,
      speed: 60,
    },

    imageUrl: "/pokemon/ivysaur.png",
  },

  {
    id: "venusaur",
    name: "Venusaur",
    description: "פוקימון זרע. הפרח הענק שעל גבו נודף ריח מרגיע שמשרה שלווה מסביב.",
    dexNumber: 3,
    types: ["grass", "poison"],
    rarity: "very-rare",

    baseStats: {
      health: 80,
      attack: 82,
      defense: 83,
      specialAttack: 100,
      specialDefense: 100,
      speed: 80,
    },

    imageUrl: "/pokemon/venusaur.png",
  },

  {
    id: "charmeleon",
    name: "Charmeleon",
    description: "פוקימון לטאה פראי ותוקפני, זנבו הבוער נעשה חזק יותר ככל שהוא נלחם.",
    dexNumber: 5,
    types: ["fire"],
    rarity: "very-rare",

    baseStats: {
      health: 58,
      attack: 64,
      defense: 58,
      specialAttack: 80,
      specialDefense: 65,
      speed: 80,
    },

    imageUrl: "/pokemon/charmeleon.png",
  },

  {
    id: "charizard",
    name: "Charizard",
    description: "פוקימון להבה מעופף רב עוצמה, נושף אש כה חמה שהיא מסוגלת להמיס סלעים.",
    dexNumber: 6,
    types: ["fire", "flying"],
    rarity: "very-rare",

    baseStats: {
      health: 78,
      attack: 84,
      defense: 78,
      specialAttack: 109,
      specialDefense: 85,
      speed: 100,
    },

    imageUrl: "/pokemon/charizard.png",
  },

  {
    id: "wartortle",
    name: "Wartortle",
    description: "פוקימון צב עם זנב שעיר, נחשב לסמל אריכות ימים בזכות פרוותו המסתלסלת.",
    dexNumber: 8,
    types: ["water"],
    rarity: "very-rare",

    baseStats: {
      health: 59,
      attack: 63,
      defense: 80,
      specialAttack: 65,
      specialDefense: 80,
      speed: 58,
    },

    imageUrl: "/pokemon/wartortle.png",
  },

  {
    id: "blastoise",
    name: "Blastoise",
    description: "פוקימון צב ענק עם תותחי מים בשריון גבו, מסוגל לירות מים בעוצמה אדירה.",
    dexNumber: 9,
    types: ["water"],
    rarity: "very-rare",

    baseStats: {
      health: 79,
      attack: 83,
      defense: 100,
      specialAttack: 85,
      specialDefense: 105,
      speed: 78,
    },

    imageUrl: "/pokemon/blastoise.png",
  },

  {
    id: "metapod",
    name: "Metapod",
    description: "פוקימון גולם, מקשיח את קליפתו ומחכה בסבלנות להשלמת תהליך ההתגלמות.",
    dexNumber: 11,
    types: ["bug"],
    rarity: "common",

    baseStats: {
      health: 50,
      attack: 20,
      defense: 55,
      specialAttack: 25,
      specialDefense: 25,
      speed: 30,
    },

    imageUrl: "/pokemon/metapod.png",
  },

  {
    id: "butterfree",
    name: "Butterfree",
    description: "פוקימון פרפר, אוסף אבקת פרחים ומאבק את כנפיו כדי לגרש טורפים.",
    dexNumber: 12,
    types: ["bug", "flying"],
    rarity: "common",

    baseStats: {
      health: 60,
      attack: 45,
      defense: 50,
      specialAttack: 90,
      specialDefense: 80,
      speed: 70,
    },

    imageUrl: "/pokemon/butterfree.png",
  },

  {
    id: "kakuna",
    name: "Kakuna",
    description: "פוקימון גולם כמעט חסר תנועה, אך מתחת לקליפתו הקשה מתרחש שינוי מהיר.",
    dexNumber: 14,
    types: ["bug", "poison"],
    rarity: "common",

    baseStats: {
      health: 45,
      attack: 25,
      defense: 50,
      specialAttack: 25,
      specialDefense: 25,
      speed: 35,
    },

    imageUrl: "/pokemon/kakuna.png",
  },

  {
    id: "beedrill",
    name: "Beedrill",
    description: "פוקימון דבורה עם שני עוקצים ארסיים בזרועותיו, תוקף בלהקות מהירות.",
    dexNumber: 15,
    types: ["bug", "poison"],
    rarity: "rare",

    baseStats: {
      health: 65,
      attack: 90,
      defense: 40,
      specialAttack: 45,
      specialDefense: 80,
      speed: 75,
    },

    imageUrl: "/pokemon/beedrill.png",
  },

  {
    id: "pidgey",
    name: "Pidgey",
    description: "פוקימון ציפור עדין ונפוץ, נוטה לברוח לפני שמבחינים בו בין השיחים.",
    dexNumber: 16,
    types: ["normal", "flying"],
    rarity: "common",

    baseStats: {
      health: 40,
      attack: 45,
      defense: 40,
      specialAttack: 35,
      specialDefense: 35,
      speed: 56,
    },

    imageUrl: "/pokemon/pidgey.png",
  },

  {
    id: "pidgeotto",
    name: "Pidgeotto",
    description: "פוקימון ציפור טריטוריאלי, שומר בקנאות על שטח ציד רחב משלו.",
    dexNumber: 17,
    types: ["normal", "flying"],
    rarity: "common",

    baseStats: {
      health: 63,
      attack: 60,
      defense: 55,
      specialAttack: 50,
      specialDefense: 50,
      speed: 71,
    },

    imageUrl: "/pokemon/pidgeotto.png",
  },

  {
    id: "pidgeot",
    name: "Pidgeot",
    description: "פוקימון ציפור מהיר להפליא, מסוגל לעוף במהירות קרובה למהירות הקול.",
    dexNumber: 18,
    types: ["normal", "flying"],
    rarity: "rare",

    baseStats: {
      health: 83,
      attack: 80,
      defense: 75,
      specialAttack: 70,
      specialDefense: 70,
      speed: 101,
    },

    imageUrl: "/pokemon/pidgeot.png",
  },

  {
    id: "rattata",
    name: "Rattata",
    description: "פוקימון מכרסם שמתרבה במהירות רבה, נמצא כמעט בכל מקום ביבשת.",
    dexNumber: 19,
    types: ["normal"],
    rarity: "common",

    baseStats: {
      health: 30,
      attack: 56,
      defense: 35,
      specialAttack: 25,
      specialDefense: 35,
      speed: 72,
    },

    imageUrl: "/pokemon/rattata.png",
  },

  {
    id: "raticate",
    name: "Raticate",
    description: "פוקימון מכרסם עם שיניים חדות שגדלות כל הזמן, מכרסם ללא הפסקה כדי לשלוט בהן.",
    dexNumber: 20,
    types: ["normal"],
    rarity: "common",

    baseStats: {
      health: 55,
      attack: 81,
      defense: 60,
      specialAttack: 50,
      specialDefense: 70,
      speed: 97,
    },

    imageUrl: "/pokemon/raticate.png",
  },

  {
    id: "spearow",
    name: "Spearow",
    description: "פוקימון ציפור קטן וחרדני, מנפנף בכנפיו הקצרות בקצב מטורף כדי להתרומם.",
    dexNumber: 21,
    types: ["normal", "flying"],
    rarity: "common",

    baseStats: {
      health: 40,
      attack: 60,
      defense: 30,
      specialAttack: 31,
      specialDefense: 31,
      speed: 70,
    },

    imageUrl: "/pokemon/spearow.png",
  },

  {
    id: "fearow",
    name: "Fearow",
    description: "פוקימון עם מקור ארוך וכנפיים חזקות, מסוגל לעוף כל היום בחיפוש אחר מזון.",
    dexNumber: 22,
    types: ["normal", "flying"],
    rarity: "common",

    baseStats: {
      health: 65,
      attack: 90,
      defense: 65,
      specialAttack: 61,
      specialDefense: 61,
      speed: 100,
    },

    imageUrl: "/pokemon/fearow.png",
  },

  {
    id: "ekans",
    name: "Ekans",
    description: "פוקימון נחש שמתפתל בשקט בין העשבים, בולע את טרפו בשלמותו.",
    dexNumber: 23,
    types: ["poison"],
    rarity: "common",

    baseStats: {
      health: 35,
      attack: 60,
      defense: 44,
      specialAttack: 40,
      specialDefense: 54,
      speed: 55,
    },

    imageUrl: "/pokemon/ekans.png",
  },

  {
    id: "arbok",
    name: "Arbok",
    description: "פוקימון נחש מפחיד עם דוגמה על בטנו שנראית כמו פנים מאיימות.",
    dexNumber: 24,
    types: ["poison"],
    rarity: "common",

    baseStats: {
      health: 60,
      attack: 95,
      defense: 69,
      specialAttack: 65,
      specialDefense: 79,
      speed: 80,
    },

    imageUrl: "/pokemon/arbok.png",
  },

  {
    id: "raichu",
    name: "Raichu",
    description: "פוקימון עכבר חשמלי, זנבו הארוך משמש כמוט הארקה כדי לשחרר עודף חשמל.",
    dexNumber: 26,
    types: ["electric"],
    rarity: "very-rare",

    baseStats: {
      health: 60,
      attack: 90,
      defense: 55,
      specialAttack: 90,
      specialDefense: 80,
      speed: 110,
    },

    imageUrl: "/pokemon/raichu.png",
  },

  {
    id: "sandshrew",
    name: "Sandshrew",
    description: "פוקימון שמתגלגל לכדור ומתחפר עמוק באדמה כדי להימלט מסכנה.",
    dexNumber: 27,
    types: ["ground"],
    rarity: "common",

    baseStats: {
      health: 50,
      attack: 75,
      defense: 85,
      specialAttack: 20,
      specialDefense: 30,
      speed: 40,
    },

    imageUrl: "/pokemon/sandshrew.png",
  },

  {
    id: "sandslash",
    name: "Sandslash",
    description: "פוקימון עם קוצים חדים על גבו, מגן על עצמו על ידי התכווצות לכדור קוצני.",
    dexNumber: 28,
    types: ["ground"],
    rarity: "common",

    baseStats: {
      health: 75,
      attack: 100,
      defense: 110,
      specialAttack: 45,
      specialDefense: 55,
      speed: 65,
    },

    imageUrl: "/pokemon/sandslash.png",
  },

  {
    id: "nidoran-f",
    name: "Nidoran♀",
    description: "פוקימון עם קרן קטנה על ראשה, ארסה חלש יותר מזה של בן זוגה אך מסוכן לא פחות.",
    dexNumber: 29,
    types: ["poison"],
    rarity: "common",

    baseStats: {
      health: 55,
      attack: 47,
      defense: 52,
      specialAttack: 40,
      specialDefense: 40,
      speed: 41,
    },

    imageUrl: "/pokemon/nidoran-f.png",
  },

  {
    id: "nidorina",
    name: "Nidorina",
    description: "פוקימון עם קוצים רכים יחסית, נעשית תוקפנית יותר כדי להגן על הקבוצה שלה.",
    dexNumber: 30,
    types: ["poison"],
    rarity: "common",

    baseStats: {
      health: 70,
      attack: 62,
      defense: 67,
      specialAttack: 55,
      specialDefense: 55,
      speed: 56,
    },

    imageUrl: "/pokemon/nidorina.png",
  },

  {
    id: "nidoqueen",
    name: "Nidoqueen",
    description: "פוקימון עם קשקשים קשים כשריון, עורה הקשיח מגן עליה מפני כמעט כל פגיעה.",
    dexNumber: 31,
    types: ["poison", "ground"],
    rarity: "rare",

    baseStats: {
      health: 90,
      attack: 92,
      defense: 87,
      specialAttack: 75,
      specialDefense: 85,
      speed: 76,
    },

    imageUrl: "/pokemon/nidoqueen.png",
  },

  {
    id: "nidoran-m",
    name: "Nidoran♂",
    description: "פוקימון עם אוזניים גדולות שקולטות כל רחש, ארסו בקרניו מתחזק ככל שהוא גדל.",
    dexNumber: 32,
    types: ["poison"],
    rarity: "common",

    baseStats: {
      health: 46,
      attack: 57,
      defense: 40,
      specialAttack: 40,
      specialDefense: 40,
      speed: 50,
    },

    imageUrl: "/pokemon/nidoran-m.png",
  },

  {
    id: "nidorino",
    name: "Nidorino",
    description: "פוקימון עם קרן קשה על ראשו, נועץ אותה בכל דבר שמעורר בו חשד.",
    dexNumber: 33,
    types: ["poison"],
    rarity: "common",

    baseStats: {
      health: 61,
      attack: 72,
      defense: 57,
      specialAttack: 55,
      specialDefense: 55,
      speed: 65,
    },

    imageUrl: "/pokemon/nidorino.png",
  },

  {
    id: "nidoking",
    name: "Nidoking",
    description: "פוקימון עוצמתי עם זנב חזק שיכול להפיל מגדל תאורה במכה אחת.",
    dexNumber: 34,
    types: ["poison", "ground"],
    rarity: "rare",

    baseStats: {
      health: 81,
      attack: 102,
      defense: 77,
      specialAttack: 85,
      specialDefense: 75,
      speed: 85,
    },

    imageUrl: "/pokemon/nidoking.png",
  },

  {
    id: "clefairy",
    name: "Clefairy",
    description: "פוקימון פיה חמוד ונדיר, נאמר שהוא יורד מהירח בלילות כוכבים נופלים.",
    dexNumber: 35,
    types: ["fairy"],
    rarity: "rare",

    baseStats: {
      health: 70,
      attack: 45,
      defense: 48,
      specialAttack: 60,
      specialDefense: 65,
      speed: 35,
    },

    imageUrl: "/pokemon/clefairy.png",
  },

  {
    id: "clefable",
    name: "Clefable",
    description: "פוקימון פיה ביישן ונדיר, נמנע ממגע עם בני אדם ונראה רק לעיתים רחוקות.",
    dexNumber: 36,
    types: ["fairy"],
    rarity: "rare",

    baseStats: {
      health: 95,
      attack: 70,
      defense: 73,
      specialAttack: 95,
      specialDefense: 90,
      speed: 60,
    },

    imageUrl: "/pokemon/clefable.png",
  },

  {
    id: "vulpix",
    name: "Vulpix",
    description: "פוקימון שועל עם שש זנבות, כל זנב אוגר אנרגיית אש עתיקה ומיסטית.",
    dexNumber: 37,
    types: ["fire"],
    rarity: "common",

    baseStats: {
      health: 38,
      attack: 41,
      defense: 40,
      specialAttack: 50,
      specialDefense: 65,
      speed: 65,
    },

    imageUrl: "/pokemon/vulpix.png",
  },

  {
    id: "ninetales",
    name: "Ninetales",
    description: "פוקימון שועל עם תשעה זנבות מפוארים, נאמר שהוא חי אלף שנים.",
    dexNumber: 38,
    types: ["fire"],
    rarity: "rare",

    baseStats: {
      health: 73,
      attack: 76,
      defense: 75,
      specialAttack: 81,
      specialDefense: 100,
      speed: 100,
    },

    imageUrl: "/pokemon/ninetales.png",
  },

  {
    id: "jigglypuff",
    name: "Jigglypuff",
    description: "פוקימון עגול ורך, שר שיר מרדים המסוגל להרדים כל מי ששומע אותו.",
    dexNumber: 39,
    types: ["normal", "fairy"],
    rarity: "common",

    baseStats: {
      health: 115,
      attack: 45,
      defense: 20,
      specialAttack: 45,
      specialDefense: 25,
      speed: 20,
    },

    imageUrl: "/pokemon/jigglypuff.png",
  },

  {
    id: "wigglytuff",
    name: "Wigglytuff",
    description: "פוקימון עם פרווה רכה כענן, עיניו הגדולות רואות במלואה בחשכה מוחלטת.",
    dexNumber: 40,
    types: ["normal", "fairy"],
    rarity: "common",

    baseStats: {
      health: 140,
      attack: 70,
      defense: 45,
      specialAttack: 85,
      specialDefense: 50,
      speed: 45,
    },

    imageUrl: "/pokemon/wigglytuff.png",
  },

  {
    id: "golbat",
    name: "Golbat",
    description: "פוקימון עטלף עם פה ענק, נושך את קורבנותיו ושואב מהם דם בלי הפסקה.",
    dexNumber: 42,
    types: ["poison", "flying"],
    rarity: "common",

    baseStats: {
      health: 75,
      attack: 80,
      defense: 70,
      specialAttack: 65,
      specialDefense: 75,
      speed: 90,
    },

    imageUrl: "/pokemon/golbat.png",
  },

  {
    id: "gloom",
    name: "Gloom",
    description: "פוקימון עשב-רעל שמפריש נוזל ריחני חריף כדי להרתיע טורפים.",
    dexNumber: 44,
    types: ["grass", "poison"],
    rarity: "common",

    baseStats: {
      health: 60,
      attack: 65,
      defense: 70,
      specialAttack: 85,
      specialDefense: 75,
      speed: 40,
    },

    imageUrl: "/pokemon/gloom.png",
  },

  {
    id: "vileplume",
    name: "Vileplume",
    description: "פוקימון עם עלי כותרת ענקיים, מפזר אבקת פרחים רעילה ומעורר התעטשות.",
    dexNumber: 45,
    types: ["grass", "poison"],
    rarity: "rare",

    baseStats: {
      health: 75,
      attack: 80,
      defense: 85,
      specialAttack: 110,
      specialDefense: 90,
      speed: 50,
    },

    imageUrl: "/pokemon/vileplume.png",
  },

  {
    id: "paras",
    name: "Paras",
    description: "פוקימון עם פטריות קטנות על גבו, הפטריות שולטות בו בהדרגה ככל שהן גדלות.",
    dexNumber: 46,
    types: ["bug", "grass"],
    rarity: "common",

    baseStats: {
      health: 35,
      attack: 70,
      defense: 55,
      specialAttack: 45,
      specialDefense: 55,
      speed: 25,
    },

    imageUrl: "/pokemon/paras.png",
  },

  {
    id: "parasect",
    name: "Parasect",
    description: "פוקימון עם פטריות ענקיות על גבו השולטות למעשה בגוף הפוקימון עצמו.",
    dexNumber: 47,
    types: ["bug", "grass"],
    rarity: "common",

    baseStats: {
      health: 60,
      attack: 95,
      defense: 80,
      specialAttack: 60,
      specialDefense: 80,
      speed: 30,
    },

    imageUrl: "/pokemon/parasect.png",
  },

  {
    id: "venonat",
    name: "Venonat",
    description: "פוקימון עם עיניים ענקיות שרואות אפילו בחשכה מוחלטת של יער סבוך.",
    dexNumber: 48,
    types: ["bug", "poison"],
    rarity: "common",

    baseStats: {
      health: 60,
      attack: 55,
      defense: 50,
      specialAttack: 40,
      specialDefense: 55,
      speed: 45,
    },

    imageUrl: "/pokemon/venonat.png",
  },

  {
    id: "venomoth",
    name: "Venomoth",
    description: "פוקימון עש, קשקשיו הצבעוניים נושרים ומפזרים אבקה רעילה עם כל נפנוף כנף.",
    dexNumber: 49,
    types: ["bug", "poison"],
    rarity: "common",

    baseStats: {
      health: 70,
      attack: 65,
      defense: 60,
      specialAttack: 90,
      specialDefense: 75,
      speed: 90,
    },

    imageUrl: "/pokemon/venomoth.png",
  },

  {
    id: "diglett",
    name: "Diglett",
    description: "פוקימון שחי כמעט כל חייו מתחת לאדמה, נראה מעל הפני קרקע רק ראשו העליון.",
    dexNumber: 50,
    types: ["ground"],
    rarity: "common",

    baseStats: {
      health: 10,
      attack: 55,
      defense: 25,
      specialAttack: 35,
      specialDefense: 45,
      speed: 95,
    },

    imageUrl: "/pokemon/diglett.png",
  },

  {
    id: "dugtrio",
    name: "Dugtrio",
    description: "פוקימון עם שלושה ראשים המחוברים תת-קרקעית, חופר מנהרות במהירות מדהימה.",
    dexNumber: 51,
    types: ["ground"],
    rarity: "common",

    baseStats: {
      health: 35,
      attack: 100,
      defense: 50,
      specialAttack: 50,
      specialDefense: 70,
      speed: 120,
    },

    imageUrl: "/pokemon/dugtrio.png",
  },

  {
    id: "meowth",
    name: "Meowth",
    description: "פוקימון חתול שאוהב חפצים נוצצים, יוצא בלילות לחפש מטבעות ואבנים יקרות.",
    dexNumber: 52,
    types: ["normal"],
    rarity: "common",

    baseStats: {
      health: 40,
      attack: 45,
      defense: 35,
      specialAttack: 40,
      specialDefense: 40,
      speed: 90,
    },

    imageUrl: "/pokemon/meowth.png",
  },

  {
    id: "persian",
    name: "Persian",
    description: "פוקימון חתול אלגנטי אך פזיז, שש הזיפים סביב פניו חשים תנודות אוויר עדינות.",
    dexNumber: 53,
    types: ["normal"],
    rarity: "common",

    baseStats: {
      health: 65,
      attack: 70,
      defense: 60,
      specialAttack: 65,
      specialDefense: 65,
      speed: 115,
    },

    imageUrl: "/pokemon/persian.png",
  },

  {
    id: "golduck",
    name: "Golduck",
    description: "פוקימון שוחה במים בחן רב, אבן על מצחו מפיקה גלי מחשבה חלשים.",
    dexNumber: 55,
    types: ["water"],
    rarity: "common",

    baseStats: {
      health: 80,
      attack: 82,
      defense: 78,
      specialAttack: 95,
      specialDefense: 80,
      speed: 85,
    },

    imageUrl: "/pokemon/golduck.png",
  },

  {
    id: "mankey",
    name: "Mankey",
    description: "פוקימון עם מזג חם מאוד, נכנס לזעם פתאומי מהסיבה הקטנה ביותר.",
    dexNumber: 56,
    types: ["fighting"],
    rarity: "common",

    baseStats: {
      health: 40,
      attack: 80,
      defense: 35,
      specialAttack: 35,
      specialDefense: 45,
      speed: 70,
    },

    imageUrl: "/pokemon/mankey.png",
  },

  {
    id: "primeape",
    name: "Primeape",
    description: "פוקימון עם כעס בלתי נגמר, ברגע שהתעצבן הוא לא נרגע עד שהניצחון בטוח.",
    dexNumber: 57,
    types: ["fighting"],
    rarity: "common",

    baseStats: {
      health: 65,
      attack: 105,
      defense: 60,
      specialAttack: 60,
      specialDefense: 70,
      speed: 95,
    },

    imageUrl: "/pokemon/primeape.png",
  },

  {
    id: "arcanine",
    name: "Arcanine",
    description: "פוקימון כלב אגדי, נחשב עתיק מאוד ונערץ בתרבויות רבות בשל מהירותו.",
    dexNumber: 59,
    types: ["fire"],
    rarity: "rare",

    baseStats: {
      health: 90,
      attack: 110,
      defense: 80,
      specialAttack: 100,
      specialDefense: 80,
      speed: 95,
    },

    imageUrl: "/pokemon/arcanine.png",
  },

  {
    id: "poliwhirl",
    name: "Poliwhirl",
    description: "פוקימון עם קרביים שקופים, הספירלה על בטנו מהפנטת כל מי שמסתכל בה.",
    dexNumber: 61,
    types: ["water"],
    rarity: "common",

    baseStats: {
      health: 65,
      attack: 65,
      defense: 65,
      specialAttack: 50,
      specialDefense: 50,
      speed: 90,
    },

    imageUrl: "/pokemon/poliwhirl.png",
  },

  {
    id: "poliwrath",
    name: "Poliwrath",
    description: "פוקימון עם שרירי בטן חזקים במיוחד, שוחה במים סוערים בלי שום קושי.",
    dexNumber: 62,
    types: ["water", "fighting"],
    rarity: "rare",

    baseStats: {
      health: 90,
      attack: 95,
      defense: 95,
      specialAttack: 70,
      specialDefense: 90,
      speed: 70,
    },

    imageUrl: "/pokemon/poliwrath.png",
  },

  {
    id: "abra",
    name: "Abra",
    description: "פוקימון עם כוחות טלפתיים חזקים, ישן כמעט כל היום כדי לחסוך באנרגיה נפשית.",
    dexNumber: 63,
    types: ["psychic"],
    rarity: "common",

    baseStats: {
      health: 25,
      attack: 20,
      defense: 15,
      specialAttack: 105,
      specialDefense: 55,
      speed: 90,
    },

    imageUrl: "/pokemon/abra.png",
  },

  {
    id: "kadabra",
    name: "Kadabra",
    description: "פוקימון עם כוחות טלקינטיים אדירים, גלי המוח שלו גורמים לשעונים בסביבה להשתגע.",
    dexNumber: 64,
    types: ["psychic"],
    rarity: "common",

    baseStats: {
      health: 40,
      attack: 35,
      defense: 30,
      specialAttack: 120,
      specialDefense: 70,
      speed: 105,
    },

    imageUrl: "/pokemon/kadabra.png",
  },

  {
    id: "alakazam",
    name: "Alakazam",
    description: "פוקימון עם מוח עצום פי כמה מגוף אדם, מסוגל לזכור כל דבר שראה אי פעם.",
    dexNumber: 65,
    types: ["psychic"],
    rarity: "rare",

    baseStats: {
      health: 55,
      attack: 50,
      defense: 45,
      specialAttack: 135,
      specialDefense: 95,
      speed: 120,
    },

    imageUrl: "/pokemon/alakazam.png",
  },

  {
    id: "machop",
    name: "Machop",
    description: "פוקימון עם שרירים בכל חלקי גופו, אוהב להרים משאות כבדים כדי להתאמן.",
    dexNumber: 66,
    types: ["fighting"],
    rarity: "common",

    baseStats: {
      health: 70,
      attack: 80,
      defense: 50,
      specialAttack: 35,
      specialDefense: 35,
      speed: 35,
    },

    imageUrl: "/pokemon/machop.png",
  },

  {
    id: "machoke",
    name: "Machoke",
    description: "פוקימון עם שרירים אדירים שחוגר חגורה כדי לרסן את כוחו העצום.",
    dexNumber: 67,
    types: ["fighting"],
    rarity: "common",

    baseStats: {
      health: 80,
      attack: 100,
      defense: 70,
      specialAttack: 50,
      specialDefense: 60,
      speed: 45,
    },

    imageUrl: "/pokemon/machoke.png",
  },

  {
    id: "machamp",
    name: "Machamp",
    description: "פוקימון עם ארבע זרועות, מסוגל להטיל אלף מכות אגרוף בזמן קצר במיוחד.",
    dexNumber: 68,
    types: ["fighting"],
    rarity: "rare",

    baseStats: {
      health: 90,
      attack: 130,
      defense: 80,
      specialAttack: 65,
      specialDefense: 85,
      speed: 55,
    },

    imageUrl: "/pokemon/machamp.png",
  },

  {
    id: "bellsprout",
    name: "Bellsprout",
    description: "פוקימון עם שורשים דקים, נוטה לנוע לאט ומעדיף לחכות שהטרף יתקרב אליו.",
    dexNumber: 69,
    types: ["grass", "poison"],
    rarity: "common",

    baseStats: {
      health: 50,
      attack: 75,
      defense: 35,
      specialAttack: 70,
      specialDefense: 30,
      speed: 40,
    },

    imageUrl: "/pokemon/bellsprout.png",
  },

  {
    id: "weepinbell",
    name: "Weepinbell",
    description: "פוקימון שפיו הפעור מפריש נוזל עיכול חזק כדי להמיס את טרפו.",
    dexNumber: 70,
    types: ["grass", "poison"],
    rarity: "common",

    baseStats: {
      health: 65,
      attack: 90,
      defense: 50,
      specialAttack: 85,
      specialDefense: 45,
      speed: 55,
    },

    imageUrl: "/pokemon/weepinbell.png",
  },

  {
    id: "victreebel",
    name: "Victreebel",
    description: "פוקימון עם פה ענק שמפתה חרקים בריח מתוק לפני שהוא בולע אותם בשלמות.",
    dexNumber: 71,
    types: ["grass", "poison"],
    rarity: "rare",

    baseStats: {
      health: 80,
      attack: 105,
      defense: 65,
      specialAttack: 100,
      specialDefense: 70,
      speed: 70,
    },

    imageUrl: "/pokemon/victreebel.png",
  },

  {
    id: "tentacruel",
    name: "Tentacruel",
    description: "פוקימון עם מאה זרועות מקלעות, ארסן שבקצותיהן חזק דיו לשתק אדם בוגר.",
    dexNumber: 73,
    types: ["water", "poison"],
    rarity: "common",

    baseStats: {
      health: 80,
      attack: 70,
      defense: 65,
      specialAttack: 80,
      specialDefense: 120,
      speed: 100,
    },

    imageUrl: "/pokemon/tentacruel.png",
  },

  {
    id: "graveler",
    name: "Graveler",
    description: "פוקימון סלע שמתגלגל במורד הרים, מותיר אחריו שביל של אבנים קטנות.",
    dexNumber: 75,
    types: ["rock", "ground"],
    rarity: "common",

    baseStats: {
      health: 55,
      attack: 95,
      defense: 115,
      specialAttack: 45,
      specialDefense: 45,
      speed: 35,
    },

    imageUrl: "/pokemon/graveler.png",
  },

  {
    id: "golem",
    name: "Golem",
    description: "פוקימון סלע ענק, מפוצץ את עצמו לעיתים כדי לשחרר מתח פנימי שנצבר בגופו.",
    dexNumber: 76,
    types: ["rock", "ground"],
    rarity: "rare",

    baseStats: {
      health: 80,
      attack: 120,
      defense: 130,
      specialAttack: 55,
      specialDefense: 65,
      speed: 45,
    },

    imageUrl: "/pokemon/golem.png",
  },

  {
    id: "rapidash",
    name: "Rapidash",
    description: "פוקימון סוס אש מהיר להפליא, יכול לרוץ במהירות של כארבעים קילומטר לדקה.",
    dexNumber: 78,
    types: ["fire"],
    rarity: "rare",

    baseStats: {
      health: 65,
      attack: 100,
      defense: 70,
      specialAttack: 80,
      specialDefense: 80,
      speed: 105,
    },

    imageUrl: "/pokemon/rapidash.png",
  },

  {
    id: "slowpoke",
    name: "Slowpoke",
    description: "פוקימון עצלן ואיטי מאוד, לוקח לו חמש שניות שלמות להרגיש כאב.",
    dexNumber: 79,
    types: ["water", "psychic"],
    rarity: "common",

    baseStats: {
      health: 90,
      attack: 65,
      defense: 65,
      specialAttack: 40,
      specialDefense: 40,
      speed: 15,
    },

    imageUrl: "/pokemon/slowpoke.png",
  },

  {
    id: "slowbro",
    name: "Slowbro",
    description: "פוקימון עם צדפה נצמדת לזנבו, כה נינוח ששוכח לעיתים מה הוא עשה רגע קודם.",
    dexNumber: 80,
    types: ["water", "psychic"],
    rarity: "common",

    baseStats: {
      health: 95,
      attack: 75,
      defense: 110,
      specialAttack: 100,
      specialDefense: 80,
      speed: 30,
    },

    imageUrl: "/pokemon/slowbro.png",
  },

  {
    id: "magnemite",
    name: "Magnemite",
    description: "פוקימון מגנטי המרחף באוויר, ניזון מחשמל ונמשך תמיד למקורות אנרגיה.",
    dexNumber: 81,
    types: ["electric", "steel"],
    rarity: "common",

    baseStats: {
      health: 25,
      attack: 35,
      defense: 70,
      specialAttack: 95,
      specialDefense: 55,
      speed: 45,
    },

    imageUrl: "/pokemon/magnemite.png",
  },

  {
    id: "magneton",
    name: "Magneton",
    description: "פוקימון עם שלושה מגנטים מחוברים, יוצר שדה מגנטי המשבש שידורי טלוויזיה.",
    dexNumber: 82,
    types: ["electric", "steel"],
    rarity: "common",

    baseStats: {
      health: 50,
      attack: 60,
      defense: 95,
      specialAttack: 120,
      specialDefense: 70,
      speed: 70,
    },

    imageUrl: "/pokemon/magneton.png",
  },

  {
    id: "farfetchd",
    name: "Farfetch'd",
    description: "פוקימון שנודד עם ענף בקק, שומר עליו כמו על אוצר יקר ולא נפרד ממנו לעולם.",
    dexNumber: 83,
    types: ["normal", "flying"],
    rarity: "rare",

    baseStats: {
      health: 52,
      attack: 90,
      defense: 55,
      specialAttack: 58,
      specialDefense: 62,
      speed: 60,
    },

    imageUrl: "/pokemon/farfetchd.png",
  },

  {
    id: "doduo",
    name: "Doduo",
    description: "פוקימון עם שני ראשים, כל ראש חושב עצמאית וישן כשהשני ער ושומר.",
    dexNumber: 84,
    types: ["normal", "flying"],
    rarity: "common",

    baseStats: {
      health: 35,
      attack: 85,
      defense: 45,
      specialAttack: 35,
      specialDefense: 35,
      speed: 75,
    },

    imageUrl: "/pokemon/doduo.png",
  },

  {
    id: "dodrio",
    name: "Dodrio",
    description: "פוקימון עם שלושה ראשים, כל ראש שולט ברגש שונה: כעס, שמחה או עצב.",
    dexNumber: 85,
    types: ["normal", "flying"],
    rarity: "common",

    baseStats: {
      health: 60,
      attack: 110,
      defense: 70,
      specialAttack: 60,
      specialDefense: 60,
      speed: 110,
    },

    imageUrl: "/pokemon/dodrio.png",
  },

  {
    id: "seel",
    name: "Seel",
    description: "פוקימון עם קרן קשה על ראשו, שוחה במימי הצפון הקפואים בלי שום קושי.",
    dexNumber: 86,
    types: ["water"],
    rarity: "common",

    baseStats: {
      health: 65,
      attack: 45,
      defense: 55,
      specialAttack: 45,
      specialDefense: 70,
      speed: 45,
    },

    imageUrl: "/pokemon/seel.png",
  },

  {
    id: "dewgong",
    name: "Dewgong",
    description: "פוקימון עם עור לבן ורך, שוחה בים בחן על ידי הנעת ארבע סנפירים בעדינות.",
    dexNumber: 87,
    types: ["water", "ice"],
    rarity: "common",

    baseStats: {
      health: 90,
      attack: 70,
      defense: 80,
      specialAttack: 70,
      specialDefense: 95,
      speed: 70,
    },

    imageUrl: "/pokemon/dewgong.png",
  },

  {
    id: "grimer",
    name: "Grimer",
    description: "פוקימון עשוי בוץ רעיל, נוצר מפסולת ולכלוך שנצברו במקומות מזוהמים.",
    dexNumber: 88,
    types: ["poison"],
    rarity: "common",

    baseStats: {
      health: 80,
      attack: 80,
      defense: 50,
      specialAttack: 40,
      specialDefense: 50,
      speed: 25,
    },

    imageUrl: "/pokemon/grimer.png",
  },

  {
    id: "muk",
    name: "Muk",
    description: "פוקימון עשוי רעל סמיך, ריחו החריף מסוגל להתפשט למרחק של קילומטר שלם.",
    dexNumber: 89,
    types: ["poison"],
    rarity: "common",

    baseStats: {
      health: 105,
      attack: 105,
      defense: 75,
      specialAttack: 65,
      specialDefense: 100,
      speed: 50,
    },

    imageUrl: "/pokemon/muk.png",
  },

  {
    id: "cloyster",
    name: "Cloyster",
    description: "פוקימון עם קונכייה קשה ביותר וקוצים חדים, נחשב לאחד הפוקימונים המוגנים ביותר.",
    dexNumber: 91,
    types: ["water", "ice"],
    rarity: "common",

    baseStats: {
      health: 50,
      attack: 95,
      defense: 180,
      specialAttack: 85,
      specialDefense: 45,
      speed: 70,
    },

    imageUrl: "/pokemon/cloyster.png",
  },

  {
    id: "gengar",
    name: "Gengar",
    description: "פוקימון צל שמתחבא בחשכה, נאמר שהוא מנסה לגנוב את צילם של מי שהוא רודף.",
    dexNumber: 94,
    types: ["ghost", "poison"],
    rarity: "rare",

    baseStats: {
      health: 60,
      attack: 65,
      defense: 60,
      specialAttack: 130,
      specialDefense: 75,
      speed: 110,
    },

    imageUrl: "/pokemon/gengar.png",
  },

  {
    id: "drowzee",
    name: "Drowzee",
    description: "פוקימון שאוכל חלומות בזמן שינה, זוכר כל חלום שאכל מאז שנולד.",
    dexNumber: 96,
    types: ["psychic"],
    rarity: "common",

    baseStats: {
      health: 60,
      attack: 48,
      defense: 45,
      specialAttack: 43,
      specialDefense: 90,
      speed: 42,
    },

    imageUrl: "/pokemon/drowzee.png",
  },

  {
    id: "hypno",
    name: "Hypno",
    description: "פוקימון עם מטוטלת מהפנטת, מסוגל להרדים אנשים תוך שניות בודדות.",
    dexNumber: 97,
    types: ["psychic"],
    rarity: "common",

    baseStats: {
      health: 85,
      attack: 73,
      defense: 70,
      specialAttack: 73,
      specialDefense: 115,
      speed: 67,
    },

    imageUrl: "/pokemon/hypno.png",
  },

  {
    id: "kingler",
    name: "Kingler",
    description: "פוקימון סרטן עם צבת ענקית וכבדה, מתקשה לפעמים לתפעל אותה בדיוק הרצוי.",
    dexNumber: 99,
    types: ["water"],
    rarity: "common",

    baseStats: {
      health: 55,
      attack: 130,
      defense: 115,
      specialAttack: 50,
      specialDefense: 50,
      speed: 75,
    },

    imageUrl: "/pokemon/kingler.png",
  },

  {
    id: "voltorb",
    name: "Voltorb",
    description: "פוקימון עגול הדומה לכדור פוקימון, נוטה להתפוצץ בקלות כשהוא נבהל.",
    dexNumber: 100,
    types: ["electric"],
    rarity: "common",

    baseStats: {
      health: 40,
      attack: 30,
      defense: 50,
      specialAttack: 55,
      specialDefense: 55,
      speed: 100,
    },

    imageUrl: "/pokemon/voltorb.png",
  },

  {
    id: "electrode",
    name: "Electrode",
    description: "פוקימון עגול טעון חשמל סטטי, מתפוצץ בעוצמה רבה כשהוא נדחק לפינה.",
    dexNumber: 101,
    types: ["electric"],
    rarity: "common",

    baseStats: {
      health: 60,
      attack: 50,
      defense: 70,
      specialAttack: 80,
      specialDefense: 80,
      speed: 150,
    },

    imageUrl: "/pokemon/electrode.png",
  },

  {
    id: "exeggcute",
    name: "Exeggcute",
    description: "פוקימון עשוי שישה ביצים, מתקשרות ביניהן באמצעות גלי טלפתיה עדינים.",
    dexNumber: 102,
    types: ["grass", "psychic"],
    rarity: "common",

    baseStats: {
      health: 60,
      attack: 40,
      defense: 80,
      specialAttack: 60,
      specialDefense: 45,
      speed: 40,
    },

    imageUrl: "/pokemon/exeggcute.png",
  },

  {
    id: "exeggutor",
    name: "Exeggutor",
    description: "פוקימון דקל עם שלושה ראשים, כל ראש חושב בנפרד וחולק על השאר לעיתים.",
    dexNumber: 103,
    types: ["grass", "psychic"],
    rarity: "common",

    baseStats: {
      health: 95,
      attack: 95,
      defense: 85,
      specialAttack: 125,
      specialDefense: 75,
      speed: 55,
    },

    imageUrl: "/pokemon/exeggutor.png",
  },

  {
    id: "marowak",
    name: "Marowak",
    description: "פוקימון שנושא עצם של אמו כנשק, למד לשלוט בה כמו לוחם מיומן.",
    dexNumber: 105,
    types: ["ground"],
    rarity: "common",

    baseStats: {
      health: 60,
      attack: 80,
      defense: 110,
      specialAttack: 50,
      specialDefense: 80,
      speed: 45,
    },

    imageUrl: "/pokemon/marowak.png",
  },

  {
    id: "hitmonlee",
    name: "Hitmonlee",
    description: "פוקימון עם רגליים שיכולות להתארך זמנית, מתמחה בבעיטות עוצמתיות.",
    dexNumber: 106,
    types: ["fighting"],
    rarity: "rare",

    baseStats: {
      health: 50,
      attack: 120,
      defense: 53,
      specialAttack: 35,
      specialDefense: 110,
      speed: 87,
    },

    imageUrl: "/pokemon/hitmonlee.png",
  },

  {
    id: "hitmonchan",
    name: "Hitmonchan",
    description: "פוקימון עם אגרופים מהירים ומדויקים, מזכיר אגרופן מקצועי בכל תנועה.",
    dexNumber: 107,
    types: ["fighting"],
    rarity: "rare",

    baseStats: {
      health: 50,
      attack: 105,
      defense: 79,
      specialAttack: 35,
      specialDefense: 110,
      speed: 76,
    },

    imageUrl: "/pokemon/hitmonchan.png",
  },

  {
    id: "lickitung",
    name: "Lickitung",
    description: "פוקימון עם לשון ארוכה במיוחד, מלקק כל דבר שסקרן אותו כדי לחקור אותו.",
    dexNumber: 108,
    types: ["normal"],
    rarity: "rare",

    baseStats: {
      health: 90,
      attack: 55,
      defense: 75,
      specialAttack: 60,
      specialDefense: 75,
      speed: 30,
    },

    imageUrl: "/pokemon/lickitung.png",
  },

  {
    id: "koffing",
    name: "Koffing",
    description: "פוקימון עשוי גזים רעילים, עלול להתפוצץ אם נחשף לניצוץ אש קרוב מדי.",
    dexNumber: 109,
    types: ["poison"],
    rarity: "common",

    baseStats: {
      health: 40,
      attack: 65,
      defense: 95,
      specialAttack: 60,
      specialDefense: 45,
      speed: 35,
    },

    imageUrl: "/pokemon/koffing.png",
  },

  {
    id: "weezing",
    name: "Weezing",
    description: "פוקימון עם שני ראשי גז מחוברים, מערבב גזים שונים כדי ליצור ריחות רעילים.",
    dexNumber: 110,
    types: ["poison"],
    rarity: "common",

    baseStats: {
      health: 65,
      attack: 90,
      defense: 120,
      specialAttack: 85,
      specialDefense: 70,
      speed: 60,
    },

    imageUrl: "/pokemon/weezing.png",
  },

  {
    id: "rhyhorn",
    name: "Rhyhorn",
    description: "פוקימון עם עור עבה כשריון, כה חסר תבונה שהוא שוכח למה התחיל לרוץ.",
    dexNumber: 111,
    types: ["ground", "rock"],
    rarity: "rare",

    baseStats: {
      health: 80,
      attack: 85,
      defense: 95,
      specialAttack: 30,
      specialDefense: 30,
      speed: 25,
    },

    imageUrl: "/pokemon/rhyhorn.png",
  },

  {
    id: "rhydon",
    name: "Rhydon",
    description: "פוקימון עם עור סלעי קשיח, מסוגל לעמוד בשלמות אפילו בלבה בוערת.",
    dexNumber: 112,
    types: ["ground", "rock"],
    rarity: "rare",

    baseStats: {
      health: 105,
      attack: 130,
      defense: 120,
      specialAttack: 45,
      specialDefense: 45,
      speed: 40,
    },

    imageUrl: "/pokemon/rhydon.png",
  },

  {
    id: "chansey",
    name: "Chansey",
    description: "פוקימון נדיר ועדין, נושא ביצה שמעניקה אושר לכל מי שמצליח לקבל אותה במתנה.",
    dexNumber: 113,
    types: ["normal"],
    rarity: "common",

    baseStats: {
      health: 250,
      attack: 5,
      defense: 5,
      specialAttack: 35,
      specialDefense: 105,
      speed: 50,
    },

    imageUrl: "/pokemon/chansey.png",
  },

  {
    id: "tangela",
    name: "Tangela",
    description: "פוקימון עשוי חבלים כחולים סבוכים, איש לא ראה מעולם מה מסתתר מתחתיהם.",
    dexNumber: 114,
    types: ["grass"],
    rarity: "common",

    baseStats: {
      health: 65,
      attack: 55,
      defense: 115,
      specialAttack: 100,
      specialDefense: 40,
      speed: 60,
    },

    imageUrl: "/pokemon/tangela.png",
  },

  {
    id: "kangaskhan",
    name: "Kangaskhan",
    description: "פוקימון עם כיס בבטנה, שומרת על גורה הקטן בכיס לאורך כל חייו הראשונים.",
    dexNumber: 115,
    types: ["normal"],
    rarity: "rare",

    baseStats: {
      health: 105,
      attack: 95,
      defense: 80,
      specialAttack: 40,
      specialDefense: 80,
      speed: 90,
    },

    imageUrl: "/pokemon/kangaskhan.png",
  },

  {
    id: "horsea",
    name: "Horsea",
    description: "פוקימון דמוי סוסון ים, יורה דיו סמיך כדי לברוח מטורפים במים עכורים.",
    dexNumber: 116,
    types: ["water"],
    rarity: "common",

    baseStats: {
      health: 30,
      attack: 40,
      defense: 70,
      specialAttack: 70,
      specialDefense: 25,
      speed: 60,
    },

    imageUrl: "/pokemon/horsea.png",
  },

  {
    id: "seadra",
    name: "Seadra",
    description: "פוקימון עם קוצי רעל על גבו, שוחה לאחור כדי לשמור על עינו על הטורף.",
    dexNumber: 117,
    types: ["water"],
    rarity: "common",

    baseStats: {
      health: 55,
      attack: 65,
      defense: 95,
      specialAttack: 95,
      specialDefense: 45,
      speed: 85,
    },

    imageUrl: "/pokemon/seadra.png",
  },

  {
    id: "goldeen",
    name: "Goldeen",
    description: "פוקימון דג עם קרן חדה על ראשו, שוחה נגד הזרם בחן ובעקביות מרשימה.",
    dexNumber: 118,
    types: ["water"],
    rarity: "common",

    baseStats: {
      health: 45,
      attack: 67,
      defense: 60,
      specialAttack: 35,
      specialDefense: 50,
      speed: 63,
    },

    imageUrl: "/pokemon/goldeen.png",
  },

  {
    id: "seaking",
    name: "Seaking",
    description: "פוקימון דג עם קרן משוננת, חופר בקרקעית הנהר כדי להטיל את ביציו בבטחה.",
    dexNumber: 119,
    types: ["water"],
    rarity: "common",

    baseStats: {
      health: 80,
      attack: 92,
      defense: 65,
      specialAttack: 65,
      specialDefense: 80,
      speed: 68,
    },

    imageUrl: "/pokemon/seaking.png",
  },

  {
    id: "staryu",
    name: "Staryu",
    description: "פוקימון בצורת כוכב ים, מרכזו הזוהר מהבהב באור אדום כשהוא פעיל בלילה.",
    dexNumber: 120,
    types: ["water"],
    rarity: "rare",

    baseStats: {
      health: 30,
      attack: 45,
      defense: 55,
      specialAttack: 70,
      specialDefense: 55,
      speed: 85,
    },

    imageUrl: "/pokemon/staryu.png",
  },

  {
    id: "starmie",
    name: "Starmie",
    description: "פוקימון בצורת כוכב סובב, ליבתו השקופה זוהרת בכל צבעי הקשת בלילה.",
    dexNumber: 121,
    types: ["water", "psychic"],
    rarity: "rare",

    baseStats: {
      health: 60,
      attack: 75,
      defense: 85,
      specialAttack: 100,
      specialDefense: 85,
      speed: 115,
    },

    imageUrl: "/pokemon/starmie.png",
  },

  {
    id: "mr-mime",
    name: "Mr. Mime",
    description: "פוקימון שמבצע פנטומימה, יוצר קירות בלתי נראים באוויר בעזרת תנועות ידיים מדויקות.",
    dexNumber: 122,
    types: ["psychic", "fairy"],
    rarity: "rare",

    baseStats: {
      health: 40,
      attack: 45,
      defense: 65,
      specialAttack: 100,
      specialDefense: 120,
      speed: 90,
    },

    imageUrl: "/pokemon/mr-mime.png",
  },

  {
    id: "scyther",
    name: "Scyther",
    description: "פוקימון עם טפריים חדים כתער, נע במהירות רבה כל כך שנראה כמעט בלתי נראה.",
    dexNumber: 123,
    types: ["bug", "flying"],
    rarity: "rare",

    baseStats: {
      health: 70,
      attack: 110,
      defense: 80,
      specialAttack: 55,
      specialDefense: 80,
      speed: 105,
    },

    imageUrl: "/pokemon/scyther.png",
  },

  {
    id: "jynx",
    name: "Jynx",
    description: "פוקימון שנע בקצב, נדמה כאילו הוא רוקד כשהוא הולך על שני רגליו.",
    dexNumber: 124,
    types: ["ice", "psychic"],
    rarity: "rare",

    baseStats: {
      health: 65,
      attack: 50,
      defense: 35,
      specialAttack: 115,
      specialDefense: 95,
      speed: 95,
    },

    imageUrl: "/pokemon/jynx.png",
  },

  {
    id: "electabuzz",
    name: "Electabuzz",
    description: "פוקימון חשמלי, נמשך תמיד לכל מקור חשמל וסופג אנרגיה ישירות דרך העור.",
    dexNumber: 125,
    types: ["electric"],
    rarity: "rare",

    baseStats: {
      health: 65,
      attack: 83,
      defense: 57,
      specialAttack: 95,
      specialDefense: 85,
      speed: 105,
    },

    imageUrl: "/pokemon/electabuzz.png",
  },

  {
    id: "magmar",
    name: "Magmar",
    description: "פוקימון עשוי אש, גופו בוער בטמפרטורה כה גבוהה שהאוויר מסביבו מרצד.",
    dexNumber: 126,
    types: ["fire"],
    rarity: "rare",

    baseStats: {
      health: 65,
      attack: 95,
      defense: 57,
      specialAttack: 100,
      specialDefense: 85,
      speed: 93,
    },

    imageUrl: "/pokemon/magmar.png",
  },

  {
    id: "pinsir",
    name: "Pinsir",
    description: "פוקימון עם צבתות ענקיות, מסוגל להרים ולזרוק יריב הכבד ממנו פי כמה.",
    dexNumber: 127,
    types: ["bug"],
    rarity: "rare",

    baseStats: {
      health: 65,
      attack: 125,
      defense: 100,
      specialAttack: 55,
      specialDefense: 70,
      speed: 85,
    },

    imageUrl: "/pokemon/pinsir.png",
  },

  {
    id: "tauros",
    name: "Tauros",
    description: "פוקימון שור פראי, מצליף בעצמו עם שלושת הזנבות שלו כדי להעלות מוטיבציה לפני מתקפה.",
    dexNumber: 128,
    types: ["normal"],
    rarity: "rare",

    baseStats: {
      health: 75,
      attack: 100,
      defense: 95,
      specialAttack: 40,
      specialDefense: 70,
      speed: 110,
    },

    imageUrl: "/pokemon/tauros.png",
  },

  {
    id: "gyarados",
    name: "Gyarados",
    description: "פוקימון ענק וזועם, ידוע בהיסטוריה שלו כאחראי להרס כפרים שלמים כשהתעצבן.",
    dexNumber: 130,
    types: ["water", "flying"],
    rarity: "rare",

    baseStats: {
      health: 95,
      attack: 125,
      defense: 79,
      specialAttack: 60,
      specialDefense: 100,
      speed: 81,
    },

    imageUrl: "/pokemon/gyarados.png",
  },

  {
    id: "lapras",
    name: "Lapras",
    description: "פוקימון עדין וחכם, נושא נוסעים על גבו ושר שירה יפהפייה מעל פני המים.",
    dexNumber: 131,
    types: ["water", "ice"],
    rarity: "rare",

    baseStats: {
      health: 130,
      attack: 85,
      defense: 80,
      specialAttack: 85,
      specialDefense: 95,
      speed: 60,
    },

    imageUrl: "/pokemon/lapras.png",
  },

  {
    id: "ditto",
    name: "Ditto",
    description: "פוקימון שיכול לשנות את גופו ולהפוך לכל יצור שהוא רואה, בדיוק בצורתו ובכוחו.",
    dexNumber: 132,
    types: ["normal"],
    rarity: "rare",

    baseStats: {
      health: 48,
      attack: 48,
      defense: 48,
      specialAttack: 48,
      specialDefense: 48,
      speed: 48,
    },

    imageUrl: "/pokemon/ditto.png",
  },

  {
    id: "eevee",
    name: "Eevee",
    description: "פוקימון עם מבנה גנטי בלתי יציב, מסוגל להתפתח לצורות שונות בהתאם לסביבתו.",
    dexNumber: 133,
    types: ["normal"],
    rarity: "rare",

    baseStats: {
      health: 55,
      attack: 55,
      defense: 50,
      specialAttack: 45,
      specialDefense: 65,
      speed: 55,
    },

    imageUrl: "/pokemon/eevee.png",
  },

  {
    id: "vaporeon",
    name: "Vaporeon",
    description: "פוקימון מים, גופו התמוסס כמעט למים ומאפשר לו להיעלם לתוכם בלי עקבות.",
    dexNumber: 134,
    types: ["water"],
    rarity: "very-rare",

    baseStats: {
      health: 130,
      attack: 65,
      defense: 60,
      specialAttack: 110,
      specialDefense: 95,
      speed: 65,
    },

    imageUrl: "/pokemon/vaporeon.png",
  },

  {
    id: "jolteon",
    name: "Jolteon",
    description: "פוקימון חשמל, פרוותו הדוקרנית מייצרת חשמל סטטי בכל תנועה קטנה שהוא עושה.",
    dexNumber: 135,
    types: ["electric"],
    rarity: "very-rare",

    baseStats: {
      health: 65,
      attack: 65,
      defense: 60,
      specialAttack: 110,
      specialDefense: 95,
      speed: 130,
    },

    imageUrl: "/pokemon/jolteon.png",
  },

  {
    id: "flareon",
    name: "Flareon",
    description: "פוקימון אש, שק אש פנימי שומר על טמפרטורת גוף של כמעט אלף מעלות.",
    dexNumber: 136,
    types: ["fire"],
    rarity: "very-rare",

    baseStats: {
      health: 65,
      attack: 130,
      defense: 60,
      specialAttack: 95,
      specialDefense: 110,
      speed: 65,
    },

    imageUrl: "/pokemon/flareon.png",
  },

  {
    id: "porygon",
    name: "Porygon",
    description: "פוקימון מלאכותי שנוצר לחלוטין בטכנולוגיית מחשב, מסוגל לנוע בתוך מרחב וירטואלי.",
    dexNumber: 137,
    types: ["normal"],
    rarity: "rare",

    baseStats: {
      health: 65,
      attack: 60,
      defense: 70,
      specialAttack: 85,
      specialDefense: 75,
      speed: 40,
    },

    imageUrl: "/pokemon/porygon.png",
  },

  {
    id: "omanyte",
    name: "Omanyte",
    description: "פוקימון קדום שהוחיה מאובן, שוחה במים על ידי משיכת קרביו לתוך קונכייתו.",
    dexNumber: 138,
    types: ["rock", "water"],
    rarity: "rare",

    baseStats: {
      health: 35,
      attack: 40,
      defense: 100,
      specialAttack: 90,
      specialDefense: 55,
      speed: 35,
    },

    imageUrl: "/pokemon/omanyte.png",
  },

  {
    id: "omastar",
    name: "Omastar",
    description: "פוקימון קדום עם קונכייה מפותלת כבדה, נכחד ככל הנראה בגלל משקלה הרב.",
    dexNumber: 139,
    types: ["rock", "water"],
    rarity: "rare",

    baseStats: {
      health: 70,
      attack: 60,
      defense: 125,
      specialAttack: 115,
      specialDefense: 70,
      speed: 55,
    },

    imageUrl: "/pokemon/omastar.png",
  },

  {
    id: "kabuto",
    name: "Kabuto",
    description: "פוקימון קדום שהוחיה מאובן, כמעט ולא השתנה במשך שלוש מאות מיליון שנה.",
    dexNumber: 140,
    types: ["rock", "water"],
    rarity: "rare",

    baseStats: {
      health: 30,
      attack: 80,
      defense: 90,
      specialAttack: 55,
      specialDefense: 45,
      speed: 55,
    },

    imageUrl: "/pokemon/kabuto.png",
  },

  {
    id: "kabutops",
    name: "Kabutops",
    description: "פוקימון קדום מהיר, חתך את טרפו בעזרת סכיניים חדים והתיז את הנוזלים שבפנים.",
    dexNumber: 141,
    types: ["rock", "water"],
    rarity: "rare",

    baseStats: {
      health: 60,
      attack: 115,
      defense: 105,
      specialAttack: 65,
      specialDefense: 70,
      speed: 80,
    },

    imageUrl: "/pokemon/kabutops.png",
  },

  {
    id: "aerodactyl",
    name: "Aerodactyl",
    description: "פוקימון קדום ועתיק, הוחיה מדגימת ענבר ונחשב לשליט השמיים הפראי מלפני אלפי שנים.",
    dexNumber: 142,
    types: ["rock", "flying"],
    rarity: "rare",

    baseStats: {
      health: 80,
      attack: 105,
      defense: 65,
      specialAttack: 60,
      specialDefense: 75,
      speed: 130,
    },

    imageUrl: "/pokemon/aerodactyl.png",
  },

  {
    id: "snorlax",
    name: "Snorlax",
    description: "פוקימון עצום שאוכל כשמונה מאות קילו ביום ואז נרדם בדיוק במקום שבו הוא עומד.",
    dexNumber: 143,
    types: ["normal"],
    rarity: "rare",

    baseStats: {
      health: 160,
      attack: 110,
      defense: 65,
      specialAttack: 65,
      specialDefense: 110,
      speed: 30,
    },

    imageUrl: "/pokemon/snorlax.png",
  },

  {
    id: "articuno",
    name: "Articuno",
    description: "פוקימון אגדי, כנפיו מכוסות קרח ומקפיאות את האוויר בכל מקום שבו הוא עף.",
    dexNumber: 144,
    types: ["ice", "flying"],
    rarity: "legendary",

    baseStats: {
      health: 90,
      attack: 85,
      defense: 100,
      specialAttack: 95,
      specialDefense: 125,
      speed: 85,
    },

    imageUrl: "/pokemon/articuno.png",
  },

  {
    id: "zapdos",
    name: "Zapdos",
    description: "פוקימון אגדי, מופיע תמיד יחד עם ברקים עזים ומזין את עצמו באנרגיית סופה.",
    dexNumber: 145,
    types: ["electric", "flying"],
    rarity: "legendary",

    baseStats: {
      health: 90,
      attack: 90,
      defense: 85,
      specialAttack: 125,
      specialDefense: 90,
      speed: 100,
    },

    imageUrl: "/pokemon/zapdos.png",
  },

  {
    id: "moltres",
    name: "Moltres",
    description: "פוקימון אגדי, כנפיו מאירות באש עזה ואומרים שהופעתו מבשרת את בוא האביב.",
    dexNumber: 146,
    types: ["fire", "flying"],
    rarity: "legendary",

    baseStats: {
      health: 90,
      attack: 100,
      defense: 90,
      specialAttack: 125,
      specialDefense: 85,
      speed: 90,
    },

    imageUrl: "/pokemon/moltres.png",
  },

  {
    id: "dratini",
    name: "Dratini",
    description: "פוקימון דרקון עדין, מפשיל את עורו שוב ושוב וגדל בכל פעם קצת יותר.",
    dexNumber: 147,
    types: ["dragon"],
    rarity: "very-rare",

    baseStats: {
      health: 41,
      attack: 64,
      defense: 45,
      specialAttack: 50,
      specialDefense: 50,
      speed: 50,
    },

    imageUrl: "/pokemon/dratini.png",
  },

  {
    id: "dragonair",
    name: "Dragonair",
    description: "פוקימון דרקון מסתורי, נאמר שהוא מסוגל לשנות את מזג האוויר בכוחו הפנימי.",
    dexNumber: 148,
    types: ["dragon"],
    rarity: "very-rare",

    baseStats: {
      health: 61,
      attack: 84,
      defense: 65,
      specialAttack: 70,
      specialDefense: 70,
      speed: 70,
    },

    imageUrl: "/pokemon/dragonair.png",
  },

  {
    id: "dragonite",
    name: "Dragonite",
    description: "פוקימון דרקון ידידותי, מסוגל להקיף את כדור הארץ בטיסה תוך שש עשרה שעות בלבד.",
    dexNumber: 149,
    types: ["dragon", "flying"],
    rarity: "very-rare",

    baseStats: {
      health: 91,
      attack: 134,
      defense: 95,
      specialAttack: 100,
      specialDefense: 100,
      speed: 80,
    },

    imageUrl: "/pokemon/dragonite.png",
  },

  {
    id: "mewtwo",
    name: "Mewtwo",
    description: "פוקימון שנוצר בניסוי גנטי, כוחו הנפשי העצום נחשב לחזק ביותר בעולם כולו.",
    dexNumber: 150,
    types: ["psychic"],
    rarity: "legendary",

    baseStats: {
      health: 106,
      attack: 110,
      defense: 90,
      specialAttack: 154,
      specialDefense: 90,
      speed: 130,
    },

    imageUrl: "/pokemon/mewtwo.png",
  },

  {
    id: "mew",
    name: "Mew",
    description: "פוקימון אגדי ונדיר ביותר, נושא בתוך הגנטיקה שלו את הקוד של כל הפוקימונים הקיימים.",
    dexNumber: 151,
    types: ["psychic"],
    rarity: "legendary",

    baseStats: {
      health: 100,
      attack: 100,
      defense: 100,
      specialAttack: 100,
      specialDefense: 100,
      speed: 100,
    },

    imageUrl: "/pokemon/mew.png",
  },
];