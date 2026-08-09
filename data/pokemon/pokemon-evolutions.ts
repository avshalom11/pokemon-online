// Level-based evolution data — a sibling table to pokemon-data.ts within
// the same Species Registry domain (data/pokemon/), never a second/
// competing catalog: every entry here only ever points at species that
// already exist in POKEMON_DATA (features/pokemon/services/species-catalog.ts's
// getSpeciesById is the only place these ids are ever resolved into real
// species facts), and no species fact (name/stats/types/etc.) is ever
// duplicated here — this file stores exactly one thing per species: what
// it evolves into by level, and at what level.
//
// Deliberately keyed by the PRE-evolution species id, one level away only
// — e.g. "charmander" -> charmeleon@16, never "charmander" -> charizard.
// features/evolution/services/evolution-progress.service.ts always looks
// this up against a Pokémon's CURRENT speciesId, so a multi-level XP grant
// can never skip a stage: reaching Charizard's own level while still a
// Charmander only ever offers Charmeleon first (see that service's own
// doc comment for the full "one stage at a time" rule).
//
// Evolution Simplification phase: this game deliberately supports only
// three evolution methods — level, level-stat (Tyrogue's branch), and
// evolution-item (see EVOLUTION_ITEM_EVOLUTIONS below) — plus one explicit
// player-choice branch (BRANCH_EVOLUTIONS, Eevee only). Friendship and
// Trade were removed entirely as evolution mechanics: every species whose
// canonical evolution used to be Friendship-based is now a normal level
// evolution (see the "Former Friendship evolutions" block below), every
// species whose canonical evolution used to be a plain Trade is now a
// normal level evolution too, and every species whose canonical evolution
// used to be Trade-with-a-held-item now evolves directly from that same
// item with no trade involved (EVOLUTION_ITEM_EVOLUTIONS). A species whose
// only canonical evolution requires a Stone/evolution-item (e.g. vulpix,
// growlithe, eevee's fire/water/thunder branches) or a special
// location/time is still deliberately left out of this table — an absent
// entry is exactly how "this species has no *level* evolution" is
// expressed, so eligibility lookups never need a separate method-filtering
// step.
export interface LevelEvolution {
  evolvesToSpeciesId: string;
  requiredLevel: number;
}

const LEVEL_EVOLUTIONS: Record<string, LevelEvolution> = {
  bulbasaur: { evolvesToSpeciesId: "ivysaur", requiredLevel: 16 },
  ivysaur: { evolvesToSpeciesId: "venusaur", requiredLevel: 32 },
  charmander: { evolvesToSpeciesId: "charmeleon", requiredLevel: 16 },
  charmeleon: { evolvesToSpeciesId: "charizard", requiredLevel: 36 },
  squirtle: { evolvesToSpeciesId: "wartortle", requiredLevel: 16 },
  wartortle: { evolvesToSpeciesId: "blastoise", requiredLevel: 36 },
  caterpie: { evolvesToSpeciesId: "metapod", requiredLevel: 7 },
  metapod: { evolvesToSpeciesId: "butterfree", requiredLevel: 10 },
  weedle: { evolvesToSpeciesId: "kakuna", requiredLevel: 7 },
  kakuna: { evolvesToSpeciesId: "beedrill", requiredLevel: 10 },
  pidgey: { evolvesToSpeciesId: "pidgeotto", requiredLevel: 18 },
  pidgeotto: { evolvesToSpeciesId: "pidgeot", requiredLevel: 36 },
  rattata: { evolvesToSpeciesId: "raticate", requiredLevel: 20 },
  spearow: { evolvesToSpeciesId: "fearow", requiredLevel: 20 },
  ekans: { evolvesToSpeciesId: "arbok", requiredLevel: 22 },
  sandshrew: { evolvesToSpeciesId: "sandslash", requiredLevel: 22 },
  "nidoran-f": { evolvesToSpeciesId: "nidorina", requiredLevel: 16 },
  "nidoran-m": { evolvesToSpeciesId: "nidorino", requiredLevel: 16 },
  zubat: { evolvesToSpeciesId: "golbat", requiredLevel: 22 },
  oddish: { evolvesToSpeciesId: "gloom", requiredLevel: 21 },
  paras: { evolvesToSpeciesId: "parasect", requiredLevel: 24 },
  venonat: { evolvesToSpeciesId: "venomoth", requiredLevel: 31 },
  diglett: { evolvesToSpeciesId: "dugtrio", requiredLevel: 26 },
  meowth: { evolvesToSpeciesId: "persian", requiredLevel: 28 },
  psyduck: { evolvesToSpeciesId: "golduck", requiredLevel: 33 },
  mankey: { evolvesToSpeciesId: "primeape", requiredLevel: 28 },
  poliwag: { evolvesToSpeciesId: "poliwhirl", requiredLevel: 25 },
  abra: { evolvesToSpeciesId: "kadabra", requiredLevel: 16 },
  // Kadabra -> Alakazam was a Trade evolution in the mainline games; this
  // project has no trading system, so it's a normal level evolution here
  // (Evolution Simplification phase) — see this file's own top-of-file
  // scope note.
  kadabra: { evolvesToSpeciesId: "alakazam", requiredLevel: 36 },
  machop: { evolvesToSpeciesId: "machoke", requiredLevel: 28 },
  // Machoke -> Machamp: former Trade evolution, now level 36 — see kadabra
  // above for the same rule.
  machoke: { evolvesToSpeciesId: "machamp", requiredLevel: 36 },
  bellsprout: { evolvesToSpeciesId: "weepinbell", requiredLevel: 21 },
  tentacool: { evolvesToSpeciesId: "tentacruel", requiredLevel: 30 },
  geodude: { evolvesToSpeciesId: "graveler", requiredLevel: 25 },
  // Graveler -> Golem: former Trade evolution, now level 36 — see kadabra
  // above for the same rule.
  graveler: { evolvesToSpeciesId: "golem", requiredLevel: 36 },
  ponyta: { evolvesToSpeciesId: "rapidash", requiredLevel: 40 },
  slowpoke: { evolvesToSpeciesId: "slowbro", requiredLevel: 37 },
  magnemite: { evolvesToSpeciesId: "magneton", requiredLevel: 30 },
  doduo: { evolvesToSpeciesId: "dodrio", requiredLevel: 31 },
  seel: { evolvesToSpeciesId: "dewgong", requiredLevel: 34 },
  grimer: { evolvesToSpeciesId: "muk", requiredLevel: 38 },
  gastly: { evolvesToSpeciesId: "haunter", requiredLevel: 25 },
  // Haunter -> Gengar: former Trade evolution, now level 36 — see kadabra
  // above for the same rule.
  haunter: { evolvesToSpeciesId: "gengar", requiredLevel: 36 },
  drowzee: { evolvesToSpeciesId: "hypno", requiredLevel: 26 },
  krabby: { evolvesToSpeciesId: "kingler", requiredLevel: 28 },
  voltorb: { evolvesToSpeciesId: "electrode", requiredLevel: 30 },
  // Cubone -> Marowak used to be a plain single-target level-28 evolution
  // here. Generation VII (Alola, Phase 2) migrated it to BRANCH_EVOLUTIONS
  // below instead (Cubone now explicitly branches into Marowak OR Alolan
  // Marowak, both at the same preserved level 28) — see this file's own
  // Alola Phase 2 comment block further down for the full rationale. Kept
  // OUT of this table so the two tables never disagree about Cubone's
  // evolution method.
  koffing: { evolvesToSpeciesId: "weezing", requiredLevel: 35 },
  rhyhorn: { evolvesToSpeciesId: "rhydon", requiredLevel: 42 },
  horsea: { evolvesToSpeciesId: "seadra", requiredLevel: 32 },
  goldeen: { evolvesToSpeciesId: "seaking", requiredLevel: 33 },
  magikarp: { evolvesToSpeciesId: "gyarados", requiredLevel: 20 },
  omanyte: { evolvesToSpeciesId: "omastar", requiredLevel: 40 },
  kabuto: { evolvesToSpeciesId: "kabutops", requiredLevel: 40 },
  dratini: { evolvesToSpeciesId: "dragonair", requiredLevel: 30 },
  dragonair: { evolvesToSpeciesId: "dragonite", requiredLevel: 55 },

  // Generation II (Phase 2) — same "unconditional level-up only" scope as
  // the Generation I table above. Sunkern is deliberately absent here
  // (Sunflora is Sun-Stone-only, never level) — see EVOLUTION_ITEM_EVOLUTIONS
  // below. Every other Johto species whose only canonical evolution is an
  // evolution-item or a stat-branch (not a fixed level target) is equally
  // absent — see EVOLUTION_ITEM_EVOLUTIONS and LEVEL_STAT_EVOLUTIONS
  // further down this file for those.
  chikorita: { evolvesToSpeciesId: "bayleef", requiredLevel: 16 },
  bayleef: { evolvesToSpeciesId: "meganium", requiredLevel: 32 },
  cyndaquil: { evolvesToSpeciesId: "quilava", requiredLevel: 14 },
  quilava: { evolvesToSpeciesId: "typhlosion", requiredLevel: 36 },
  totodile: { evolvesToSpeciesId: "croconaw", requiredLevel: 18 },
  croconaw: { evolvesToSpeciesId: "feraligatr", requiredLevel: 30 },
  sentret: { evolvesToSpeciesId: "furret", requiredLevel: 15 },
  hoothoot: { evolvesToSpeciesId: "noctowl", requiredLevel: 20 },
  ledyba: { evolvesToSpeciesId: "ledian", requiredLevel: 18 },
  spinarak: { evolvesToSpeciesId: "ariados", requiredLevel: 22 },
  chinchou: { evolvesToSpeciesId: "lanturn", requiredLevel: 27 },
  natu: { evolvesToSpeciesId: "xatu", requiredLevel: 25 },
  mareep: { evolvesToSpeciesId: "flaaffy", requiredLevel: 15 },
  flaaffy: { evolvesToSpeciesId: "ampharos", requiredLevel: 30 },
  marill: { evolvesToSpeciesId: "azumarill", requiredLevel: 18 },
  hoppip: { evolvesToSpeciesId: "skiploom", requiredLevel: 18 },
  skiploom: { evolvesToSpeciesId: "jumpluff", requiredLevel: 27 },
  wooper: { evolvesToSpeciesId: "quagsire", requiredLevel: 20 },
  pineco: { evolvesToSpeciesId: "forretress", requiredLevel: 31 },
  snubbull: { evolvesToSpeciesId: "granbull", requiredLevel: 23 },
  teddiursa: { evolvesToSpeciesId: "ursaring", requiredLevel: 30 },
  slugma: { evolvesToSpeciesId: "magcargo", requiredLevel: 38 },
  swinub: { evolvesToSpeciesId: "piloswine", requiredLevel: 33 },
  remoraid: { evolvesToSpeciesId: "octillery", requiredLevel: 25 },
  houndour: { evolvesToSpeciesId: "houndoom", requiredLevel: 24 },
  phanpy: { evolvesToSpeciesId: "donphan", requiredLevel: 25 },
  larvitar: { evolvesToSpeciesId: "pupitar", requiredLevel: 30 },
  pupitar: { evolvesToSpeciesId: "tyranitar", requiredLevel: 55 },
  // The three Generation II baby Pokémon that evolve by LEVEL into their
  // already-existing Generation I adult form — Jynx/Electabuzz/Magmar
  // themselves are unchanged, final-stage entries; only their new
  // pre-evolution is added here.
  smoochum: { evolvesToSpeciesId: "jynx", requiredLevel: 30 },
  elekid: { evolvesToSpeciesId: "electabuzz", requiredLevel: 30 },
  magby: { evolvesToSpeciesId: "magmar", requiredLevel: 30 },

  // Evolution Simplification phase — the six Generation II baby/near-baby
  // species whose only canonical evolution used to be Friendship-based are
  // now plain level-16 evolutions (Eevee is the one exception: its own
  // former Friendship split is now an explicit player CHOICE at level 16,
  // never automatic — see BRANCH_EVOLUTIONS below, never this table).
  pichu: { evolvesToSpeciesId: "pikachu", requiredLevel: 16 },
  cleffa: { evolvesToSpeciesId: "clefairy", requiredLevel: 16 },
  igglybuff: { evolvesToSpeciesId: "jigglypuff", requiredLevel: 16 },
  togepi: { evolvesToSpeciesId: "togetic", requiredLevel: 16 },
  // Golbat -> Crobat is deliberately level 36, NOT 16 like the other
  // former Friendship evolutions above. Golbat's own pre-evolution
  // requirement (zubat -> golbat @ level 22, above) is a real, separate,
  // unchanged Generation I rule — a level-16 Crobat threshold would sit
  // BELOW that level-22 floor and produce an empty/impossible wild range
  // for Golbat itself (minimum 22 > maximum 15), making Golbat
  // unencounterable in the wild. Level 36 keeps every stage's own range
  // non-empty: Zubat 1-21, Golbat 22-35, Crobat 36+ (verified in
  // engine/evolution-stage-scaling/species-wild-level-range.ts's own
  // deriveSpeciesWildLevelRange).
  golbat: { evolvesToSpeciesId: "crobat", requiredLevel: 36 },
  chansey: { evolvesToSpeciesId: "blissey", requiredLevel: 16 },

  // Generation III (Hoenn, Phase 2) — same "unconditional level-up only"
  // scope as the Generation I/II blocks above, including the same
  // simplification rules already established for Kanto/Johto:
  //   - A species whose real-game evolution is Stone-based keeps that
  //     method (see the Hoenn block in EVOLUTION_ITEM_EVOLUTIONS below:
  //     lombre -> ludicolo via water-stone, nuzleaf -> shiftry via
  //     leaf-stone) — never flattened to level, exactly like Gloom/
  //     Weepinbell/Exeggcute already weren't.
  //   - A species whose real-game evolution requires Moon Stone (Skitty ->
  //     Delcatty) keeps that method — see the Hoenn Completeness Review
  //     block in EVOLUTION_ITEM_EVOLUTIONS below, never this table. Moon
  //     Stone is now a real, generalized EvolutionItemId (the Hoenn
  //     Completeness Review also backfilled the four pre-existing Kanto
  //     Moon Stone evolutions — Nidorina/Nidorino/Clefairy/Jigglypuff — that
  //     had been left out entirely up to that point).
  //   - Wurmple's real-game personality-value split (Silcoon vs Cascoon) is
  //     an explicit level-7 player CHOICE instead — see BRANCH_EVOLUTIONS
  //     below, never this table, and never a hidden/random value.
  //   - Feebas's real-game Beauty-condition evolution is simplified to a
  //     flat level-30 evolution per this phase's own explicit spec — no
  //     Beauty/Contests/Pokéblocks/Prism Scale mechanic exists in this
  //     project.
  //   - Clamperl's real-game evolution requires trading while holding an
  //     item; this project has no trading system, so both branches evolve
  //     directly from Water Stone instead (huntail and gorebyss, a genuine
  //     player-choice branch under one shared item — Evolution Item Cleanup
  //     phase) — see the Hoenn block in EVOLUTION_ITEM_EVOLUTIONS below,
  //     never this table.
  //   - Nincada is deliberately absent here — the real games' SIMULTANEOUS
  //     bonus Shedinja (obtained for free alongside Ninjask, requiring an
  //     empty party slot + a spare Poké Ball) is NOT implemented, and never
  //     will be invented as a "one evolution produces two Pokémon" mechanic.
  //     Instead, Nincada is a normal level-20 BRANCH — the player explicitly
  //     chooses Ninjask or Shedinja, exactly one target, replacing Nincada
  //     in place, the same shape Eevee/Wurmple already use. See
  //     BRANCH_EVOLUTIONS below, never this table.
  treecko: { evolvesToSpeciesId: "grovyle", requiredLevel: 16 },
  grovyle: { evolvesToSpeciesId: "sceptile", requiredLevel: 36 },
  torchic: { evolvesToSpeciesId: "combusken", requiredLevel: 16 },
  combusken: { evolvesToSpeciesId: "blaziken", requiredLevel: 36 },
  mudkip: { evolvesToSpeciesId: "marshtomp", requiredLevel: 16 },
  marshtomp: { evolvesToSpeciesId: "swampert", requiredLevel: 36 },
  poochyena: { evolvesToSpeciesId: "mightyena", requiredLevel: 18 },
  zigzagoon: { evolvesToSpeciesId: "linoone", requiredLevel: 20 },
  // Wurmple itself is deliberately absent here — see BRANCH_EVOLUTIONS.
  silcoon: { evolvesToSpeciesId: "beautifly", requiredLevel: 10 },
  cascoon: { evolvesToSpeciesId: "dustox", requiredLevel: 10 },
  lotad: { evolvesToSpeciesId: "lombre", requiredLevel: 14 },
  // lombre -> ludicolo is Water-Stone, not level — see EVOLUTION_ITEM_EVOLUTIONS.
  seedot: { evolvesToSpeciesId: "nuzleaf", requiredLevel: 14 },
  // nuzleaf -> shiftry is Leaf-Stone, not level — see EVOLUTION_ITEM_EVOLUTIONS.
  taillow: { evolvesToSpeciesId: "swellow", requiredLevel: 22 },
  wingull: { evolvesToSpeciesId: "pelipper", requiredLevel: 25 },
  ralts: { evolvesToSpeciesId: "kirlia", requiredLevel: 20 },
  kirlia: { evolvesToSpeciesId: "gardevoir", requiredLevel: 30 },
  surskit: { evolvesToSpeciesId: "masquerain", requiredLevel: 22 },
  shroomish: { evolvesToSpeciesId: "breloom", requiredLevel: 23 },
  slakoth: { evolvesToSpeciesId: "vigoroth", requiredLevel: 18 },
  vigoroth: { evolvesToSpeciesId: "slaking", requiredLevel: 36 },
  // Nincada itself is deliberately absent here — see BRANCH_EVOLUTIONS.
  whismur: { evolvesToSpeciesId: "loudred", requiredLevel: 20 },
  loudred: { evolvesToSpeciesId: "exploud", requiredLevel: 40 },
  makuhita: { evolvesToSpeciesId: "hariyama", requiredLevel: 24 },
  // Azurill's real-game evolution is Friendship-based — same simplification
  // rule as pichu/cleffa/igglybuff/togepi above (a plain level evolution,
  // never the incense breeding mechanic that produces Azurill in the first
  // place, which this project doesn't implement either).
  azurill: { evolvesToSpeciesId: "marill", requiredLevel: 16 },
  // skitty (-> delcatty) is Moon-Stone, not level — see the Hoenn
  // Completeness Review block in EVOLUTION_ITEM_EVOLUTIONS below.
  aron: { evolvesToSpeciesId: "lairon", requiredLevel: 32 },
  lairon: { evolvesToSpeciesId: "aggron", requiredLevel: 42 },
  meditite: { evolvesToSpeciesId: "medicham", requiredLevel: 37 },
  electrike: { evolvesToSpeciesId: "manectric", requiredLevel: 26 },
  gulpin: { evolvesToSpeciesId: "swalot", requiredLevel: 26 },
  carvanha: { evolvesToSpeciesId: "sharpedo", requiredLevel: 30 },
  wailmer: { evolvesToSpeciesId: "wailord", requiredLevel: 40 },
  numel: { evolvesToSpeciesId: "camerupt", requiredLevel: 33 },
  spoink: { evolvesToSpeciesId: "grumpig", requiredLevel: 32 },
  trapinch: { evolvesToSpeciesId: "vibrava", requiredLevel: 35 },
  vibrava: { evolvesToSpeciesId: "flygon", requiredLevel: 45 },
  cacnea: { evolvesToSpeciesId: "cacturne", requiredLevel: 32 },
  swablu: { evolvesToSpeciesId: "altaria", requiredLevel: 35 },
  barboach: { evolvesToSpeciesId: "whiscash", requiredLevel: 30 },
  corphish: { evolvesToSpeciesId: "crawdaunt", requiredLevel: 30 },
  baltoy: { evolvesToSpeciesId: "claydol", requiredLevel: 36 },
  lileep: { evolvesToSpeciesId: "cradily", requiredLevel: 40 },
  anorith: { evolvesToSpeciesId: "armaldo", requiredLevel: 40 },
  // Feebas's real-game Beauty-condition evolution is simplified to a flat
  // level 30 per this phase's own explicit spec — see this block's own top
  // note.
  feebas: { evolvesToSpeciesId: "milotic", requiredLevel: 30 },
  shuppet: { evolvesToSpeciesId: "banette", requiredLevel: 37 },
  duskull: { evolvesToSpeciesId: "dusclops", requiredLevel: 37 },
  // Wynaut (Hoenn) evolving into Wobbuffet (already Johto's own #202) —
  // same "baby added in a later generation, adult unchanged" precedent as
  // smoochum/elekid/magby -> jynx/electabuzz/magmar above.
  wynaut: { evolvesToSpeciesId: "wobbuffet", requiredLevel: 15 },
  snorunt: { evolvesToSpeciesId: "glalie", requiredLevel: 42 },
  spheal: { evolvesToSpeciesId: "sealeo", requiredLevel: 32 },
  sealeo: { evolvesToSpeciesId: "walrein", requiredLevel: 44 },
  // clamperl (-> huntail/gorebyss) is deliberately absent — real-game
  // Trade-with-item evolution, replaced by two direct evolution-item
  // branches instead. See EVOLUTION_ITEM_EVOLUTIONS below.
  bagon: { evolvesToSpeciesId: "shelgon", requiredLevel: 30 },
  shelgon: { evolvesToSpeciesId: "salamence", requiredLevel: 50 },
  beldum: { evolvesToSpeciesId: "metang", requiredLevel: 20 },
  metang: { evolvesToSpeciesId: "metagross", requiredLevel: 45 },
  // Regirock/Regice/Registeel/Latias/Latios/Kyogre/Groudon/Rayquaza/
  // Jirachi/Deoxys (all four forms)/Castform are all deliberately absent —
  // none of them evolve.

  // Generation IV (Sinnoh, Phase 2) — same "unconditional level-up only"
  // scope as every generation above, plus this phase's own explicit
  // simplification rules for the official mechanics this project doesn't
  // implement:
  //   - Friendship (Budew/Buneary/Bonsly/Mime Jr./Munchlax/Riolu/Chingling,
  //     plus Riolu and Chingling's real-game Time-of-day/night condition,
  //     plus Bonsly/Mime Jr.'s real-game Move-Known condition) is flattened
  //     to a plain level-16 evolution — same default level every prior
  //     Friendship simplification in this file already uses (pichu/cleffa/
  //     igglybuff/togepi/chansey/azurill), deviated from only when a chain
  //     collision forces otherwise (golbat/crobat is still the only such
  //     case, unaffected by this block).
  //   - Combee -> Vespiquen's real-game Gender restriction (only female
  //     Combee evolve) is dropped — since there is only one possible
  //     target, this is a plain level-21 evolution, never a fake one-target
  //     "branch". Burmy's own Gender split (Wormadam vs Mothim, two REAL
  //     targets) is a genuine choice instead — see BRANCH_EVOLUTIONS below,
  //     never this table.
  //   - Mantyke -> Mantine's real-game "must level up with a Remoraid in
  //     the party" condition (not Friendship, but equally unimplementable)
  //     is flattened to the same default level-16 evolution.
  //   - Move-Known conditions (Aipom -> Ambipom/Double Hit, Tangela ->
  //     Tangrowth/Ancient Power, Lickitung -> Lickilicky/Rollout, Yanma ->
  //     Yanmega/Ancient Power) keep their real canonical level and simply
  //     drop the move-known requirement — these DO have a genuine
  //     game-canon level unlike pure-Friendship cases, so that real number
  //     is kept rather than defaulting to 16.
  //   - Location evolutions (Magneton -> Magnezone and Nosepass ->
  //     Probopass, both "level up at a special magnetic field" in the
  //     source games, no canonical level) become plain level evolutions at
  //     a level comfortably above their own pre-evolution's floor.
  //   - Eevee's own Leafeon/Glaceon (real-game Location evolution near a
  //     Moss Rock/Icy Rock) and Kirlia/Snorunt's Gender-restricted second
  //     targets (Gallade/Froslass) are NOT here — all four are direct
  //     evolution-item evolutions (Leaf Stone/Ice Stone/Dawn Stone) — see
  //     EVOLUTION_ITEM_EVOLUTIONS below, never this table or
  //     BRANCH_EVOLUTIONS.
  //   - Piloswine's real Move-Known (Ancient Power) target level isn't
  //     precisely canonical in the source games either; a comfortably
  //     higher level than Piloswine's own level-33 pre-evolution is used
  //     instead, keeping the same "final stage sits well above its middle
  //     stage" shape every other three-stage-adjacent chain in this table
  //     already has.
  //   - Real Trade/Trade-with-held-item evolutions (Rhydon/Electabuzz/
  //     Magmar/Porygon2/Dusclops, plus Roselia/Togetic/Happiny's Shiny/
  //     Moon Stone branches and Sneasel/Gligar/Misdreavus/Murkrow's
  //     Ice/Dusk Stone branches) are deliberately absent
  //     here — see EVOLUTION_ITEM_EVOLUTIONS below, never this table.
  turtwig: { evolvesToSpeciesId: "grotle", requiredLevel: 18 },
  grotle: { evolvesToSpeciesId: "torterra", requiredLevel: 32 },
  chimchar: { evolvesToSpeciesId: "monferno", requiredLevel: 14 },
  monferno: { evolvesToSpeciesId: "infernape", requiredLevel: 36 },
  piplup: { evolvesToSpeciesId: "prinplup", requiredLevel: 16 },
  prinplup: { evolvesToSpeciesId: "empoleon", requiredLevel: 36 },
  starly: { evolvesToSpeciesId: "staravia", requiredLevel: 14 },
  staravia: { evolvesToSpeciesId: "staraptor", requiredLevel: 34 },
  bidoof: { evolvesToSpeciesId: "bibarel", requiredLevel: 15 },
  kricketot: { evolvesToSpeciesId: "kricketune", requiredLevel: 10 },
  shinx: { evolvesToSpeciesId: "luxio", requiredLevel: 15 },
  luxio: { evolvesToSpeciesId: "luxray", requiredLevel: 30 },
  // Budew -> Roselia (Hoenn, #315) is a real cross-generation link: Roselia
  // itself was a Hoenn final-stage species until this phase added both its
  // own new pre-evolution here AND its own new post-evolution (Roselia ->
  // Roserade, Shiny Stone) in EVOLUTION_ITEM_EVOLUTIONS below.
  budew: { evolvesToSpeciesId: "roselia", requiredLevel: 16 },
  cranidos: { evolvesToSpeciesId: "rampardos", requiredLevel: 30 },
  shieldon: { evolvesToSpeciesId: "bastiodon", requiredLevel: 30 },
  combee: { evolvesToSpeciesId: "vespiquen", requiredLevel: 21 },
  buizel: { evolvesToSpeciesId: "floatzel", requiredLevel: 26 },
  cherubi: { evolvesToSpeciesId: "cherrim", requiredLevel: 25 },
  shellos: { evolvesToSpeciesId: "gastrodon", requiredLevel: 30 },
  drifloon: { evolvesToSpeciesId: "drifblim", requiredLevel: 28 },
  buneary: { evolvesToSpeciesId: "lopunny", requiredLevel: 16 },
  glameow: { evolvesToSpeciesId: "purugly", requiredLevel: 38 },
  stunky: { evolvesToSpeciesId: "skuntank", requiredLevel: 34 },
  bronzor: { evolvesToSpeciesId: "bronzong", requiredLevel: 33 },
  // Bonsly -> Sudowoodo (Johto, #185): Sudowoodo itself is unchanged,
  // final-stage — only its new pre-evolution is added here, same
  // "baby added in a later generation" precedent as smoochum/elekid/magby/
  // wynaut above.
  bonsly: { evolvesToSpeciesId: "sudowoodo", requiredLevel: 16 },
  // Mime Jr. -> Mr. Mime (Kanto, #122): same precedent as Bonsly above.
  "mime-jr": { evolvesToSpeciesId: "mr-mime", requiredLevel: 16 },
  gible: { evolvesToSpeciesId: "gabite", requiredLevel: 24 },
  gabite: { evolvesToSpeciesId: "garchomp", requiredLevel: 48 },
  // Munchlax -> Snorlax (Kanto, #143): same precedent as Bonsly above.
  munchlax: { evolvesToSpeciesId: "snorlax", requiredLevel: 16 },
  riolu: { evolvesToSpeciesId: "lucario", requiredLevel: 16 },
  hippopotas: { evolvesToSpeciesId: "hippowdon", requiredLevel: 34 },
  skorupi: { evolvesToSpeciesId: "drapion", requiredLevel: 40 },
  croagunk: { evolvesToSpeciesId: "toxicroak", requiredLevel: 37 },
  finneon: { evolvesToSpeciesId: "lumineon", requiredLevel: 31 },
  // Mantyke -> Mantine (Johto, #226): same precedent as Bonsly above.
  mantyke: { evolvesToSpeciesId: "mantine", requiredLevel: 16 },
  snover: { evolvesToSpeciesId: "abomasnow", requiredLevel: 40 },
  // Aipom (Johto, #190) -> Ambipom: former Move-Known (Double Hit)
  // evolution, now a plain level evolution at its real canonical level.
  aipom: { evolvesToSpeciesId: "ambipom", requiredLevel: 32 },
  // Magneton (Kanto, #082) -> Magnezone: former Location (special magnetic
  // field) evolution, now a plain level evolution comfortably above
  // Magnemite -> Magneton's own level-30 floor.
  magneton: { evolvesToSpeciesId: "magnezone", requiredLevel: 40 },
  // Lickitung (Kanto, #108) -> Lickilicky: former Move-Known (Rollout)
  // evolution, now a plain level evolution at its real canonical level.
  lickitung: { evolvesToSpeciesId: "lickilicky", requiredLevel: 33 },
  // Tangela (Kanto, #114) -> Tangrowth: former Move-Known (Ancient Power)
  // evolution, now a plain level evolution at its real canonical level.
  tangela: { evolvesToSpeciesId: "tangrowth", requiredLevel: 36 },
  // Yanma (Johto, #193) -> Yanmega: former Move-Known (Ancient Power)
  // evolution, now a plain level evolution at its real canonical level.
  yanma: { evolvesToSpeciesId: "yanmega", requiredLevel: 33 },
  // Piloswine (Johto, #221) -> Mamoswine: former Move-Known (Ancient
  // Power) evolution, now a plain level evolution comfortably above
  // Swinub -> Piloswine's own level-33 floor.
  piloswine: { evolvesToSpeciesId: "mamoswine", requiredLevel: 45 },
  // Nosepass (Hoenn, #299) -> Probopass: former Location (special magnetic
  // field) evolution, now a plain level evolution — same rule as Magneton
  // -> Magnezone above.
  nosepass: { evolvesToSpeciesId: "probopass", requiredLevel: 42 },
  // Chingling -> Chimecho (Hoenn, #358): former Friendship+night evolution,
  // now the same default level-16 evolution as every other Friendship
  // simplification in this block.
  chingling: { evolvesToSpeciesId: "chimecho", requiredLevel: 16 },

  // Generation V (Unova, Phase 2) — same "unconditional level-up only"
  // scope as every generation above, plus this phase's own explicit
  // simplification rules:
  //   - Friendship (Woobat -> Swoobat, Swadloon -> Leavanny) is flattened to
  //     a plain level evolution — Woobat has no pre-evolution of its own, so
  //     it gets the same default level-16 every prior baby/near-baby
  //     Friendship simplification in this file uses; Swadloon already has a
  //     real canonical pre-evolution level (Sewaddle -> Swadloon @20), so a
  //     flat 16 would sit BELOW that floor and produce an empty/impossible
  //     wild range (same Golbat-style collision this file's Generation I
  //     block already documents) — level 30 is used instead, comfortably
  //     above Swadloon's own arrival level.
  //   - Real Trade evolutions (Gurdurr -> Conkeldurr, Boldore -> Gigalith,
  //     Karrablast -> Escavalier, Shelmet -> Accelgor) are now plain level
  //     evolutions at the levels this phase's own spec assigns (40/40/35/35)
  //     — no trade of any kind, no evolution item, no branch; see this
  //     file's own Kadabra/Machoke/Graveler/Haunter precedent (Generation I)
  //     for the same "former Trade, now level" rule. Karrablast and Shelmet
  //     each have no pre-evolution of their own (they're the base of their
  //     own two-species trade pair in the source games), so 35 is a safe,
  //     collision-free standalone threshold for both.
  //   - Real Stone evolutions (Pansage/Pansear/Panpour's elemental-monkey
  //     trio, Munna, Cottonee, Petilil, Eelektrik, Minccino, Lampent) keep
  //     their real-game item methods — see EVOLUTION_ITEM_EVOLUTIONS below,
  //     never this table, same "Stone-based evolution stays Stone-based"
  //     rule Vulpix/Growlithe/Gloom/Lombre/Nuzleaf already established.
  //   - Deino/Zweilous/Hydreigon is Unova's own pseudo-legendary line (same
  //     "very-rare at every stage" rarity precedent as Dratini/Larvitar/
  //     Bagon/Beldum/Gible) — a plain three-stage level chain, no special
  //     mechanic in the source games to begin with.
  //   - Legendary/mythical species (Victini, Cobalion/Terrakion/Virizion,
  //     Tornadus/Thundurus/Landorus incl. their Therian forms, Reshiram,
  //     Zekrom, Kyurem incl. Black/White, Keldeo, Meloetta incl. Pirouette,
  //     Genesect) and every genuinely standalone non-evolving species
  //     (Audino, Throh, Sawk, Basculin, Maractus, Sigilyph, Emolga,
  //     Alomomola, Cryogonal, Stunfisk, Druddigon, Bouffalant, Heatmor,
  //     Durant) are all deliberately absent here — none of them evolve.
  //   - Alternate forms (Tornadus/Thundurus/Landorus Therian, Kyurem
  //     Black/White, Meloetta Pirouette) never get their own evolution
  //     entry — a form is a different appearance of the same species, never
  //     a different evolutionary stage (see data/pokemon/
  //     generation-5-pokemon-data.ts's own Forms doc comment).
  snivy: { evolvesToSpeciesId: "servine", requiredLevel: 17 },
  servine: { evolvesToSpeciesId: "serperior", requiredLevel: 36 },
  tepig: { evolvesToSpeciesId: "pignite", requiredLevel: 17 },
  pignite: { evolvesToSpeciesId: "emboar", requiredLevel: 36 },
  oshawott: { evolvesToSpeciesId: "dewott", requiredLevel: 17 },
  dewott: { evolvesToSpeciesId: "samurott", requiredLevel: 36 },
  patrat: { evolvesToSpeciesId: "watchog", requiredLevel: 20 },
  lillipup: { evolvesToSpeciesId: "herdier", requiredLevel: 16 },
  herdier: { evolvesToSpeciesId: "stoutland", requiredLevel: 32 },
  purrloin: { evolvesToSpeciesId: "liepard", requiredLevel: 20 },
  pidove: { evolvesToSpeciesId: "tranquill", requiredLevel: 21 },
  tranquill: { evolvesToSpeciesId: "unfezant", requiredLevel: 32 },
  blitzle: { evolvesToSpeciesId: "zebstrika", requiredLevel: 27 },
  roggenrola: { evolvesToSpeciesId: "boldore", requiredLevel: 25 },
  // Boldore -> Gigalith: former Trade evolution, now level 40 — see this
  // block's own top note.
  boldore: { evolvesToSpeciesId: "gigalith", requiredLevel: 40 },
  // Woobat -> Swoobat: former Friendship evolution, now the default level
  // 16 (no pre-evolution of its own, so no collision) — see this block's
  // own top note.
  woobat: { evolvesToSpeciesId: "swoobat", requiredLevel: 16 },
  drilbur: { evolvesToSpeciesId: "excadrill", requiredLevel: 31 },
  timburr: { evolvesToSpeciesId: "gurdurr", requiredLevel: 25 },
  // Gurdurr -> Conkeldurr: former Trade evolution, now level 40 — see this
  // block's own top note.
  gurdurr: { evolvesToSpeciesId: "conkeldurr", requiredLevel: 40 },
  tympole: { evolvesToSpeciesId: "palpitoad", requiredLevel: 25 },
  palpitoad: { evolvesToSpeciesId: "seismitoad", requiredLevel: 36 },
  sewaddle: { evolvesToSpeciesId: "swadloon", requiredLevel: 20 },
  // Swadloon -> Leavanny: former Friendship evolution, now level 30 (above
  // Swadloon's own level-20 floor) — see this block's own top note.
  swadloon: { evolvesToSpeciesId: "leavanny", requiredLevel: 30 },
  venipede: { evolvesToSpeciesId: "whirlipede", requiredLevel: 22 },
  whirlipede: { evolvesToSpeciesId: "scolipede", requiredLevel: 30 },
  sandile: { evolvesToSpeciesId: "krokorok", requiredLevel: 29 },
  krokorok: { evolvesToSpeciesId: "krookodile", requiredLevel: 40 },
  darumaka: { evolvesToSpeciesId: "darmanitan", requiredLevel: 35 },
  dwebble: { evolvesToSpeciesId: "crustle", requiredLevel: 34 },
  scraggy: { evolvesToSpeciesId: "scrafty", requiredLevel: 39 },
  yamask: { evolvesToSpeciesId: "cofagrigus", requiredLevel: 34 },
  tirtouga: { evolvesToSpeciesId: "carracosta", requiredLevel: 37 },
  archen: { evolvesToSpeciesId: "archeops", requiredLevel: 37 },
  trubbish: { evolvesToSpeciesId: "garbodor", requiredLevel: 36 },
  zorua: { evolvesToSpeciesId: "zoroark", requiredLevel: 30 },
  gothita: { evolvesToSpeciesId: "gothorita", requiredLevel: 32 },
  gothorita: { evolvesToSpeciesId: "gothitelle", requiredLevel: 41 },
  solosis: { evolvesToSpeciesId: "duosion", requiredLevel: 32 },
  duosion: { evolvesToSpeciesId: "reuniclus", requiredLevel: 41 },
  ducklett: { evolvesToSpeciesId: "swanna", requiredLevel: 35 },
  vanillite: { evolvesToSpeciesId: "vanillish", requiredLevel: 35 },
  vanillish: { evolvesToSpeciesId: "vanilluxe", requiredLevel: 47 },
  deerling: { evolvesToSpeciesId: "sawsbuck", requiredLevel: 34 },
  // Karrablast -> Escavalier: former Trade evolution (with Shelmet), now
  // level 35 — see this block's own top note.
  karrablast: { evolvesToSpeciesId: "escavalier", requiredLevel: 35 },
  foongus: { evolvesToSpeciesId: "amoonguss", requiredLevel: 39 },
  frillish: { evolvesToSpeciesId: "jellicent", requiredLevel: 40 },
  joltik: { evolvesToSpeciesId: "galvantula", requiredLevel: 36 },
  ferroseed: { evolvesToSpeciesId: "ferrothorn", requiredLevel: 40 },
  klink: { evolvesToSpeciesId: "klang", requiredLevel: 38 },
  klang: { evolvesToSpeciesId: "klinklang", requiredLevel: 49 },
  tynamo: { evolvesToSpeciesId: "eelektrik", requiredLevel: 39 },
  // eelektrik -> eelektross is Thunder-Stone, not level — see
  // EVOLUTION_ITEM_EVOLUTIONS below.
  elgyem: { evolvesToSpeciesId: "beheeyem", requiredLevel: 42 },
  litwick: { evolvesToSpeciesId: "lampent", requiredLevel: 41 },
  // lampent -> chandelure is Dusk-Stone, not level — see
  // EVOLUTION_ITEM_EVOLUTIONS below.
  axew: { evolvesToSpeciesId: "fraxure", requiredLevel: 38 },
  fraxure: { evolvesToSpeciesId: "haxorus", requiredLevel: 48 },
  cubchoo: { evolvesToSpeciesId: "beartic", requiredLevel: 37 },
  // Shelmet -> Accelgor: former Trade evolution (with Karrablast), now
  // level 35 — see this block's own top note.
  shelmet: { evolvesToSpeciesId: "accelgor", requiredLevel: 35 },
  mienfoo: { evolvesToSpeciesId: "mienshao", requiredLevel: 50 },
  golett: { evolvesToSpeciesId: "golurk", requiredLevel: 43 },
  pawniard: { evolvesToSpeciesId: "bisharp", requiredLevel: 52 },
  rufflet: { evolvesToSpeciesId: "braviary", requiredLevel: 54 },
  vullaby: { evolvesToSpeciesId: "mandibuzz", requiredLevel: 54 },
  // Deino/Zweilous/Hydreigon — Unova's pseudo-legendary line (very-rare at
  // every stage, see data/pokemon/generation-5-pokemon-data.ts's own rarity
  // note) — plain three-stage level chain, same as Dratini/Larvitar/Bagon/
  // Beldum/Gible.
  deino: { evolvesToSpeciesId: "zweilous", requiredLevel: 50 },
  zweilous: { evolvesToSpeciesId: "hydreigon", requiredLevel: 64 },
  larvesta: { evolvesToSpeciesId: "volcarona", requiredLevel: 59 },

  // Generation VI (Kalos, Phase 2) — same "unconditional level-up only"
  // scope as every generation above, plus this phase's own explicit
  // simplification rules for the official Kalos mechanics this project
  // doesn't implement:
  //   - Party composition (Pancham -> Pangoro requires another Dark-type
  //     Pokémon in the party) is dropped; Pancham's own real canonical
  //     level (32) is kept as a plain level evolution, no party check.
  //   - Device orientation (Inkay -> Malamar requires leveling up while the
  //     console is held upside down) is dropped; Inkay's own real
  //     canonical level (30) is kept as a plain level evolution.
  //   - Weather (Sliggoo -> Goodra requires leveling up in rain) is
  //     dropped; Sliggoo's own real canonical level (50) is kept as a
  //     plain level evolution — same "keep the real number, drop the
  //     unsupported condition" rule Feebas/Tyrunt/Amaura already follow.
  //   - Trade (Phantump -> Trevenant, Pumpkaboo -> Gourgeist) becomes a
  //     normal level evolution — same "former Trade, now level" precedent
  //     Kadabra/Machoke/Graveler/Haunter (Generation I) and
  //     Gurdurr/Boldore/Karrablast/Shelmet (Generation V) already
  //     established. Neither Phantump nor Pumpkaboo has a pre-evolution of
  //     its own, so level 35 is a safe, collision-free standalone
  //     threshold for both, same shape as Karrablast/Shelmet -> 35 above.
  //   - Time-of-day (Tyrunt -> Tyrantrum requires night, Amaura -> Aurorus
  //     requires day) is dropped; both keep their real canonical level (39).
  //   - Real Stone evolutions (Floette -> Florges, Doublade -> Aegislash,
  //     Helioptile -> Heliolisk) and the Trade-with-held-item evolutions
  //     simplified per this phase's own explicit spec (Eevee -> Sylveon,
  //     Spritzee -> Aromatisse, Swirlix -> Slurpuff, all Shiny Stone) keep
  //     their real-game item methods — see EVOLUTION_ITEM_EVOLUTIONS below,
  //     never this table, same "Stone-based evolution stays Stone-based"
  //     rule every prior generation already established.
  //   - Goomy/Sliggoo/Goodra is Kalos's own pseudo-legendary line (same
  //     "very-rare at every stage" rarity precedent as Dratini/Larvitar/
  //     Bagon/Beldum/Gible/Deino) — a plain three-stage level chain.
  //   - Legendary/mythical species (Xerneas, Yveltal, Zygarde, Diancie,
  //     Hoopa incl. Unbound Form, Volcanion) and every genuinely standalone
  //     non-evolving species (Furfrou, Hawlucha, Dedenne, Carbink, Klefki)
  //     are all deliberately absent here — none of them evolve. Hoopa
  //     Unbound is a Form (features/pokemon/forms), never an evolution
  //     target — no "hoopa -> hoopa-unbound" entry exists in any table in
  //     this file.
  chespin: { evolvesToSpeciesId: "quilladin", requiredLevel: 16 },
  quilladin: { evolvesToSpeciesId: "chesnaught", requiredLevel: 36 },
  fennekin: { evolvesToSpeciesId: "braixen", requiredLevel: 16 },
  braixen: { evolvesToSpeciesId: "delphox", requiredLevel: 36 },
  froakie: { evolvesToSpeciesId: "frogadier", requiredLevel: 16 },
  frogadier: { evolvesToSpeciesId: "greninja", requiredLevel: 36 },
  bunnelby: { evolvesToSpeciesId: "diggersby", requiredLevel: 20 },
  fletchling: { evolvesToSpeciesId: "fletchinder", requiredLevel: 17 },
  fletchinder: { evolvesToSpeciesId: "talonflame", requiredLevel: 35 },
  scatterbug: { evolvesToSpeciesId: "spewpa", requiredLevel: 9 },
  spewpa: { evolvesToSpeciesId: "vivillon", requiredLevel: 12 },
  litleo: { evolvesToSpeciesId: "pyroar", requiredLevel: 35 },
  flabebe: { evolvesToSpeciesId: "floette", requiredLevel: 19 },
  // floette -> florges is Shiny Stone, not level — see EVOLUTION_ITEM_EVOLUTIONS.
  skiddo: { evolvesToSpeciesId: "gogoat", requiredLevel: 32 },
  // Pancham -> Pangoro: former party-composition (another Dark-type
  // required) evolution, now a plain level evolution — see this block's
  // own top note.
  pancham: { evolvesToSpeciesId: "pangoro", requiredLevel: 32 },
  espurr: { evolvesToSpeciesId: "meowstic", requiredLevel: 25 },
  honedge: { evolvesToSpeciesId: "doublade", requiredLevel: 35 },
  // doublade -> aegislash is Dusk Stone, not level — see EVOLUTION_ITEM_EVOLUTIONS.
  // Inkay -> Malamar: former device-orientation (upside-down) evolution,
  // now a plain level evolution — see this block's own top note.
  inkay: { evolvesToSpeciesId: "malamar", requiredLevel: 30 },
  binacle: { evolvesToSpeciesId: "barbaracle", requiredLevel: 39 },
  skrelp: { evolvesToSpeciesId: "dragalge", requiredLevel: 48 },
  clauncher: { evolvesToSpeciesId: "clawitzer", requiredLevel: 37 },
  // Tyrunt -> Tyrantrum: former time-of-day (night) evolution, now a plain
  // level evolution at its real canonical level — see this block's own top
  // note.
  tyrunt: { evolvesToSpeciesId: "tyrantrum", requiredLevel: 39 },
  // Amaura -> Aurorus: former time-of-day (day) evolution, now a plain
  // level evolution at its real canonical level — see this block's own top
  // note.
  amaura: { evolvesToSpeciesId: "aurorus", requiredLevel: 39 },
  goomy: { evolvesToSpeciesId: "sliggoo", requiredLevel: 40 },
  // Sliggoo -> Goodra: former weather (rain) evolution, now a plain level
  // evolution at its real canonical level — see this block's own top note.
  sliggoo: { evolvesToSpeciesId: "goodra", requiredLevel: 50 },
  // Phantump -> Trevenant: former Trade evolution, now level 35 — see this
  // block's own top note.
  phantump: { evolvesToSpeciesId: "trevenant", requiredLevel: 35 },
  // Pumpkaboo -> Gourgeist: former Trade evolution, now level 35 — see this
  // block's own top note.
  pumpkaboo: { evolvesToSpeciesId: "gourgeist", requiredLevel: 35 },
  bergmite: { evolvesToSpeciesId: "avalugg", requiredLevel: 37 },
  noibat: { evolvesToSpeciesId: "noivern", requiredLevel: 48 },

  // Generation VII (Alola, Phase 2) — same "unconditional level-up only"
  // scope as every generation above, plus this phase's own explicit
  // simplification rules for the official Alola mechanics this project
  // doesn't implement:
  //   - Location (Charjabug -> Vikavolt, "level up at Vast Poni Canyon") is
  //     dropped in favor of a direct Thunder Stone use instead — see
  //     EVOLUTION_ITEM_EVOLUTIONS below, never this table (Vikavolt is
  //     Electric-type and Thunder Stone already exists in the catalog, so
  //     no new evolution item is introduced).
  //   - Location (Crabrawler -> Crabominable, "level up at Mount Lanakila")
  //     is dropped; a plain level-35 evolution is used instead (this
  //     phase's own explicit spec).
  //   - Gender (Salandit -> Salazzle, female only) is dropped; any owned
  //     Salandit may evolve, at the real canonical level 33.
  //   - Move-Known (Steenee -> Tsareena/Stomp, Poipole -> Naganadel/Dragon
  //     Pulse) is dropped; both keep this phase's own assigned level (29
  //     and 40 respectively) without checking known moves.
  //   - Friendship (Type: Null -> Silvally) is dropped; a plain level-40
  //     evolution is used instead (this phase's own explicit spec).
  //   - Pokémon GO Candy (Meltan -> Melmetal, 400 Meltan Candy in the real
  //     mechanic) is dropped entirely — no candy/currency/item requirement
  //     of any kind; a plain level-40 evolution is used instead (this
  //     phase's own explicit spec).
  //   - Rockruff (-> Lycanroc) and Cubone (-> Marowak) are NOT here —
  //     Rockruff's real-game day/night/Own-Tempo three-way split and
  //     Cubone's new Alolan-Form second target are both explicit
  //     player-chosen BRANCH_EVOLUTIONS instead — see below, never this
  //     table. Cosmoem's real-game version-exclusive Solgaleo/Lunala split
  //     is the same shape — also BRANCH_EVOLUTIONS, never this table.
  //   - Alolan Forms (regional variants of Kanto species, generation-7-
  //     pokemon-data.ts) get their own level evolutions here wherever the
  //     real games use level: rattata-alola/diglett-alola/geodude-alola/
  //     graveler-alola/grimer-alola all mirror their Kantonian line's own
  //     level (dropping only the unsupported night/location condition
  //     where one existed), and meowth-alola mirrors ordinary Meowth's own
  //     level 28 (dropping the real-game Friendship condition, same
  //     Friendship-simplification rule as every prior generation). Alolan
  //     Sandshrew/Vulpix (-> Ice Stone) are NOT here — see
  //     EVOLUTION_ITEM_EVOLUTIONS below.
  rowlet: { evolvesToSpeciesId: "dartrix", requiredLevel: 17 },
  dartrix: { evolvesToSpeciesId: "decidueye", requiredLevel: 34 },
  litten: { evolvesToSpeciesId: "torracat", requiredLevel: 17 },
  torracat: { evolvesToSpeciesId: "incineroar", requiredLevel: 34 },
  popplio: { evolvesToSpeciesId: "brionne", requiredLevel: 17 },
  brionne: { evolvesToSpeciesId: "primarina", requiredLevel: 34 },
  pikipek: { evolvesToSpeciesId: "trumbeak", requiredLevel: 14 },
  trumbeak: { evolvesToSpeciesId: "toucannon", requiredLevel: 28 },
  yungoos: { evolvesToSpeciesId: "gumshoos", requiredLevel: 20 },
  grubbin: { evolvesToSpeciesId: "charjabug", requiredLevel: 20 },
  // Crabrawler -> Crabominable: former Location (Mount Lanakila) evolution,
  // now a plain level evolution — see this block's own top note.
  crabrawler: { evolvesToSpeciesId: "crabominable", requiredLevel: 35 },
  cutiefly: { evolvesToSpeciesId: "ribombee", requiredLevel: 25 },
  mareanie: { evolvesToSpeciesId: "toxapex", requiredLevel: 38 },
  mudbray: { evolvesToSpeciesId: "mudsdale", requiredLevel: 30 },
  dewpider: { evolvesToSpeciesId: "araquanid", requiredLevel: 22 },
  fomantis: { evolvesToSpeciesId: "lurantis", requiredLevel: 34 },
  morelull: { evolvesToSpeciesId: "shiinotic", requiredLevel: 24 },
  // Salandit -> Salazzle: former Gender-restricted (female only) evolution,
  // now a plain level evolution at its real canonical level — see this
  // block's own top note.
  salandit: { evolvesToSpeciesId: "salazzle", requiredLevel: 33 },
  stufful: { evolvesToSpeciesId: "bewear", requiredLevel: 27 },
  bounsweet: { evolvesToSpeciesId: "steenee", requiredLevel: 18 },
  // Steenee -> Tsareena: former Move-Known (Stomp) evolution, now a plain
  // level evolution at this phase's own assigned level — see this block's
  // own top note.
  steenee: { evolvesToSpeciesId: "tsareena", requiredLevel: 29 },
  wimpod: { evolvesToSpeciesId: "golisopod", requiredLevel: 30 },
  sandygast: { evolvesToSpeciesId: "palossand", requiredLevel: 34 },
  // Type: Null -> Silvally: former Friendship evolution, now a plain
  // level-40 evolution — see this block's own top note.
  "type-null": { evolvesToSpeciesId: "silvally", requiredLevel: 40 },
  "jangmo-o": { evolvesToSpeciesId: "hakamo-o", requiredLevel: 35 },
  "hakamo-o": { evolvesToSpeciesId: "kommo-o", requiredLevel: 45 },
  cosmog: { evolvesToSpeciesId: "cosmoem", requiredLevel: 43 },
  // Poipole -> Naganadel: former Move-Known (Dragon Pulse) evolution, now a
  // plain level evolution at this phase's own assigned level — see this
  // block's own top note.
  poipole: { evolvesToSpeciesId: "naganadel", requiredLevel: 40 },
  // Meltan -> Melmetal: former Pokémon GO Candy evolution, now a plain
  // level evolution with no candy/currency/item requirement of any kind —
  // see this block's own top note.
  meltan: { evolvesToSpeciesId: "melmetal", requiredLevel: 40 },

  // Alolan Forms — regional variants of Kanto species (bases in
  // generation-1-pokemon-data.ts). See this block's own top note.
  "rattata-alola": { evolvesToSpeciesId: "raticate-alola", requiredLevel: 20 },
  "diglett-alola": { evolvesToSpeciesId: "dugtrio-alola", requiredLevel: 26 },
  // Alolan Meowth -> Alolan Persian: former Friendship evolution, now a
  // plain level evolution mirroring ordinary Meowth's own level 28 — see
  // this block's own top note.
  "meowth-alola": { evolvesToSpeciesId: "persian-alola", requiredLevel: 28 },
  "geodude-alola": { evolvesToSpeciesId: "graveler-alola", requiredLevel: 25 },
  // Alolan Graveler -> Alolan Golem: same former-Trade simplification this
  // table already applies to the Kantonian line (graveler -> golem @36,
  // above in the Generation I block) — reused verbatim rather than
  // inventing a different Trade replacement just for Alola.
  "graveler-alola": { evolvesToSpeciesId: "golem-alola", requiredLevel: 36 },
  "grimer-alola": { evolvesToSpeciesId: "muk-alola", requiredLevel: 38 },
};

// The one place a species' level-evolution target/threshold is ever looked
// up — returns undefined for a species with no level evolution (final
// stage, or its only evolution method isn't level-based, per this file's
// own scope note above). Never derived from price, name, or any other
// field — this table is the single source of truth for "does this species
// have a level evolution, and at what level."
export function getLevelEvolution(speciesId: string): LevelEvolution | undefined {
  return LEVEL_EVOLUTIONS[speciesId];
}

export interface LevelEvolutionEntry {
  speciesId: string;
  evolution: LevelEvolution;
}

// The one way to traverse the WHOLE Level Evolution table (rather than
// looking up a single species via getLevelEvolution above) — used by
// engine/evolution-stage-scaling to build its own reverse index ("which
// level was THIS species reached at", the mirror image of the forward
// speciesId -> evolvesToSpeciesId/requiredLevel lookup above). Returns a
// fresh array view over the same single LEVEL_EVOLUTIONS table, never a
// second/duplicated evolution catalog.
export function getAllLevelEvolutionEntries(): LevelEvolutionEntry[] {
  return Object.entries(LEVEL_EVOLUTIONS).map(([speciesId, evolution]) => ({ speciesId, evolution }));
}

// ============================================================================
// Evolution-Item Evolution — a direct-use evolution item, consumed straight
// from the Inventory with no trade of any kind involved (Evolution
// Simplification phase). Generalizes what used to be two separate concepts
// (Stone-Based Evolution, and Trade-with-a-held-item Evolution) into one:
// every entry below evolves a species the moment the matching item is
// consumed on it, via the exact same Inventory-initiated confirm/cancel
// flow regardless of which item it is. `itemId` is always one of the
// Shop's own canonical item ids (features/shop/data/shop-items.ts) — every
// EvolutionItemId is purchasable there (Evolution Item Cleanup phase) —
// never a duplicated/derived id, so an evolution-item lookup and an
// inventory quantity check always agree on what "this item" means.
//
// One species can have more than one evolution-item branch (Eevee's five
// elemental stones, Gloom's two), so every entry is an array — a
// single-item species just has one element. Two entries sharing the SAME
// itemId (Clamperl's two Water Stone targets) is a genuine player-choice
// BRANCH, not two independent evolutions — see
// getEvolutionItemEvolutionsByItem below. Every species below is
// deliberately absent from LEVEL_EVOLUTIONS (see that table's own scope
// note) — the two tables are mutually exclusive per species, so a lookup
// never has to choose between a level and an evolution-item result for the
// same species.
// Evolution Item Cleanup phase — the final, single-source-of-truth catalog:
// 10 Evolution Stones + 6 Evolution Items (King's Rock/Metal Coat/Dragon
// Scale/Upgrade/Protector/Reaper Cloth), all 16 purchasable in the Shop
// (features/shop/data/shop-items.ts) at the same 70/35 buy/sell price. Every
// former Trade-with-held-item evolution that used to need its own unique
// held item (Electirizer, Magmarizer, Razor Claw, Razor Fang, Dubious Disc,
// Deep Sea Tooth, Deep Sea Scale, Oval Stone) was remapped onto one of these
// 16 shared items instead — see EVOLUTION_ITEM_EVOLUTIONS below for exactly
// which species uses which item now.
export type EvolutionItemId =
  | "fire-stone"
  | "water-stone"
  | "thunder-stone"
  | "leaf-stone"
  | "sun-stone"
  | "moon-stone"
  | "ice-stone"
  | "dawn-stone"
  | "dusk-stone"
  | "shiny-stone"
  | "kings-rock"
  | "metal-coat"
  | "dragon-scale"
  | "upgrade"
  | "protector"
  | "reaper-cloth";

export interface EvolutionItemEvolution {
  method: "evolution-item";
  evolvesToSpeciesId: string;
  itemId: EvolutionItemId;
}

const EVOLUTION_ITEM_EVOLUTIONS: Record<string, EvolutionItemEvolution[]> = {
  vulpix: [{ method: "evolution-item", evolvesToSpeciesId: "ninetales", itemId: "fire-stone" }],
  growlithe: [{ method: "evolution-item", evolvesToSpeciesId: "arcanine", itemId: "fire-stone" }],
  poliwhirl: [
    { method: "evolution-item", evolvesToSpeciesId: "poliwrath", itemId: "water-stone" },
    // Evolution Simplification phase — former Trade-with-King's-Rock
    // evolution, now a direct King's Rock use, fully independent of
    // Poliwhirl's own pre-existing Water Stone branch above (same
    // multi-method-per-species precedent as Eevee/Gloom).
    { method: "evolution-item", evolvesToSpeciesId: "politoed", itemId: "kings-rock" },
  ],
  shellder: [{ method: "evolution-item", evolvesToSpeciesId: "cloyster", itemId: "water-stone" }],
  staryu: [{ method: "evolution-item", evolvesToSpeciesId: "starmie", itemId: "water-stone" }],
  pikachu: [
    { method: "evolution-item", evolvesToSpeciesId: "raichu", itemId: "thunder-stone" },
    // Generation VII (Alola, Phase 2) — Alolan Raichu is reachable through
    // the exact same Thunder Stone, a second entry sharing pikachu's
    // existing thunder-stone itemId — same "two entries, same itemId, is a
    // genuine player-choice BRANCH" shape Clamperl's Water Stone already
    // established (see clamperl below). The player explicitly picks
    // Raichu or Alolan Raichu; nothing about the player's current region is
    // ever consulted.
    { method: "evolution-item", evolvesToSpeciesId: "raichu-alola", itemId: "thunder-stone" },
  ],
  gloom: [
    { method: "evolution-item", evolvesToSpeciesId: "vileplume", itemId: "leaf-stone" },
    // Generation II (Phase 2) — Gloom's second, independent stone branch:
    // Sun Stone instead of Leaf Stone. Same "one species, multiple
    // evolution-item branches" shape Eevee already established below, just
    // with two branches instead of three.
    { method: "evolution-item", evolvesToSpeciesId: "bellossom", itemId: "sun-stone" },
  ],
  weepinbell: [{ method: "evolution-item", evolvesToSpeciesId: "victreebel", itemId: "leaf-stone" }],
  exeggcute: [
    { method: "evolution-item", evolvesToSpeciesId: "exeggutor", itemId: "leaf-stone" },
    // Generation VII (Alola, Phase 2) — Alolan Exeggutor is reachable
    // through the exact same Leaf Stone, same Clamperl-shaped
    // two-entries-same-itemId branch as Pikachu -> Raichu/Alolan Raichu
    // above.
    { method: "evolution-item", evolvesToSpeciesId: "exeggutor-alola", itemId: "leaf-stone" },
  ],
  eevee: [
    { method: "evolution-item", evolvesToSpeciesId: "flareon", itemId: "fire-stone" },
    { method: "evolution-item", evolvesToSpeciesId: "vaporeon", itemId: "water-stone" },
    { method: "evolution-item", evolvesToSpeciesId: "jolteon", itemId: "thunder-stone" },
    // Generation IV (Sinnoh, Phase 2 design correction) — Leafeon/Glaceon's
    // real-game evolution method is Location (leveling up near a Moss
    // Rock/Icy Rock), which this project doesn't implement. Originally
    // added as two more Branch targets alongside Espeon/Umbreon, then
    // corrected to match this table's own existing "former
    // Location/Trade/Friendship evolution, now direct item use" precedent
    // instead — Leaf Stone already exists (reused directly, same item
    // Gloom/Weepinbell/Nuzleaf/Lombre already use), Ice Stone is new (see
    // EvolutionItemId's own doc comment).
    { method: "evolution-item", evolvesToSpeciesId: "leafeon", itemId: "leaf-stone" },
    { method: "evolution-item", evolvesToSpeciesId: "glaceon", itemId: "ice-stone" },
    // Generation VI (Kalos, Phase 2) — Sylveon's real-game evolution method
    // is affection (Pokémon-Amie/friendship past a threshold) while knowing
    // a Fairy-type move, neither of which this project implements. Same
    // "former unsupported mechanic, now direct item use" precedent as
    // Leafeon/Glaceon just above — Shiny Stone is reused (already used by
    // Roselia -> Roserade and Togetic -> Togekiss) rather than introducing
    // a new product, and Sylveon is deliberately NOT added to the
    // Espeon/Umbreon level-16 BRANCH below (an item evolution and a level
    // branch are two independent, coexisting methods for the same species,
    // same "one species, multiple methods" shape Slowpoke/Kirlia/Snorunt
    // already establish).
    { method: "evolution-item", evolvesToSpeciesId: "sylveon", itemId: "shiny-stone" },
    // Eevee's remaining two Generation II forms (Espeon/Umbreon) are a
    // player-chosen level-16 BRANCH, not an item — see BRANCH_EVOLUTIONS
    // below, never this table.
  ],
  // Generation II (Phase 2) — Sunkern's only canonical evolution; must never
  // be added to LEVEL_EVOLUTIONS (see that table's own Generation II note).
  sunkern: [{ method: "evolution-item", evolvesToSpeciesId: "sunflora", itemId: "sun-stone" }],
  // Evolution Simplification phase — former Trade-with-held-item
  // evolutions, now direct item uses. No trade of any kind is required for
  // any of these.
  slowpoke: [{ method: "evolution-item", evolvesToSpeciesId: "slowking", itemId: "kings-rock" }],
  onix: [{ method: "evolution-item", evolvesToSpeciesId: "steelix", itemId: "metal-coat" }],
  scyther: [{ method: "evolution-item", evolvesToSpeciesId: "scizor", itemId: "metal-coat" }],
  seadra: [{ method: "evolution-item", evolvesToSpeciesId: "kingdra", itemId: "dragon-scale" }],
  porygon: [{ method: "evolution-item", evolvesToSpeciesId: "porygon2", itemId: "upgrade" }],

  // Generation III (Hoenn, Phase 2) — lombre/nuzleaf keep their real-game
  // Stone methods (never flattened to level, see LEVEL_EVOLUTIONS's own
  // Hoenn block note).
  lombre: [{ method: "evolution-item", evolvesToSpeciesId: "ludicolo", itemId: "water-stone" }],
  nuzleaf: [{ method: "evolution-item", evolvesToSpeciesId: "shiftry", itemId: "leaf-stone" }],
  // Evolution Item Cleanup phase — Clamperl's former Deep Sea Tooth/Deep Sea
  // Scale two-item split is now a genuine BRANCH under one shared item: both
  // targets use Water Stone. Two entries, same itemId, is exactly what makes
  // this a branch rather than two independent single-target evolutions — see
  // getEvolutionItemEvolutionsByItem below, the one query that returns both
  // at once so the Inventory UI can offer the same Huntail-vs-Gorebyss
  // choice Eevee/Wurmple/Nincada's BRANCH_EVOLUTIONS already offer for level
  // evolutions (getEvolutionItemEvolutionByItem's plain .find() would only
  // ever surface Huntail here — never use it for Clamperl).
  clamperl: [
    { method: "evolution-item", evolvesToSpeciesId: "huntail", itemId: "water-stone" },
    { method: "evolution-item", evolvesToSpeciesId: "gorebyss", itemId: "water-stone" },
  ],

  // Hoenn Completeness Review — Moon Stone. skitty is the new Hoenn entry
  // this review adds; nidorina/nidorino/clefairy/jigglypuff are pre-existing
  // Kanto species whose canonical Moon-Stone evolution was never added to
  // this table at all until now (confirmed missing by inspection — they had
  // no entry in EITHER LEVEL_EVOLUTIONS or EVOLUTION_ITEM_EVOLUTIONS, so
  // they were silently treated as already-final-stage). All five are
  // simple single-branch species, same shape as vulpix/growlithe above.
  nidorina: [{ method: "evolution-item", evolvesToSpeciesId: "nidoqueen", itemId: "moon-stone" }],
  nidorino: [{ method: "evolution-item", evolvesToSpeciesId: "nidoking", itemId: "moon-stone" }],
  clefairy: [{ method: "evolution-item", evolvesToSpeciesId: "clefable", itemId: "moon-stone" }],
  jigglypuff: [{ method: "evolution-item", evolvesToSpeciesId: "wigglytuff", itemId: "moon-stone" }],
  skitty: [{ method: "evolution-item", evolvesToSpeciesId: "delcatty", itemId: "moon-stone" }],

  // Generation IV (Sinnoh, Phase 2) — Roselia (Hoenn, #315) -> Roserade:
  // real-game Shiny Stone evolution, unrelated to Roselia's own new
  // pre-evolution (Budew, LEVEL_EVOLUTIONS above).
  roselia: [{ method: "evolution-item", evolvesToSpeciesId: "roserade", itemId: "shiny-stone" }],
  // Happiny -> Chansey: former Friendship+Time(day) evolution, then a direct
  // Oval Stone use — Evolution Item Cleanup phase remaps it onto Moon Stone
  // (Oval Stone removed from the catalog entirely). Chansey's own
  // pre-existing level-16 evolution into Blissey is untouched.
  happiny: [{ method: "evolution-item", evolvesToSpeciesId: "chansey", itemId: "moon-stone" }],
  // Sneasel (Johto, #215) -> Weavile: former Trade-while-holding-Razor-Claw
  // (at night) evolution, then a direct Razor Claw use — Evolution Item
  // Cleanup phase remaps it onto Ice Stone (Razor Claw removed).
  sneasel: [{ method: "evolution-item", evolvesToSpeciesId: "weavile", itemId: "ice-stone" }],
  // Rhydon (Kanto, #112) -> Rhyperior: former Trade-while-holding-Protector
  // evolution — Protector is one of the six kept Evolution Items, unchanged.
  rhydon: [{ method: "evolution-item", evolvesToSpeciesId: "rhyperior", itemId: "protector" }],
  // Electabuzz (Kanto, #125) -> Electivire: former
  // Trade-while-holding-Electirizer evolution — Evolution Item Cleanup phase
  // remaps it onto Thunder Stone (Electirizer removed).
  electabuzz: [{ method: "evolution-item", evolvesToSpeciesId: "electivire", itemId: "thunder-stone" }],
  // Magmar (Kanto, #126) -> Magmortar: former Trade-while-holding-
  // Magmarizer evolution — Evolution Item Cleanup phase remaps it onto Fire
  // Stone (Magmarizer removed).
  magmar: [{ method: "evolution-item", evolvesToSpeciesId: "magmortar", itemId: "fire-stone" }],
  // Togetic (Johto, #176) -> Togekiss: real-game Shiny Stone evolution.
  // Togetic's own pre-existing evolution FROM Togepi is untouched.
  togetic: [{ method: "evolution-item", evolvesToSpeciesId: "togekiss", itemId: "shiny-stone" }],
  // Gligar (Hoenn, #207) -> Gliscor: former Trade-while-holding-Razor-Fang
  // (at night) evolution — Evolution Item Cleanup phase remaps it onto Dusk
  // Stone (Razor Fang removed).
  gligar: [{ method: "evolution-item", evolvesToSpeciesId: "gliscor", itemId: "dusk-stone" }],
  // Porygon2 (Johto, #233) -> Porygon-Z: former
  // Trade-while-holding-Dubious-Disc evolution — Evolution Item Cleanup
  // phase remaps it onto Upgrade (Dubious Disc removed), the same item
  // Porygon itself already uses to reach Porygon2 — two independent,
  // consecutive stages of the same line sharing one item is fine, same as
  // any other evolution-item lookup (always keyed by the PRE-evolution
  // species, one stage at a time, per this file's own top-of-file rule).
  porygon2: [{ method: "evolution-item", evolvesToSpeciesId: "porygon-z", itemId: "upgrade" }],
  // Kirlia (Hoenn, #281) -> Gallade: real-game Gender-restricted second
  // target (Dawn Stone, male only) — Gender evolution is forbidden, so
  // this becomes an independent evolution-item branch that exists
  // alongside Kirlia's own pre-existing level-30 evolution into Gardevoir,
  // same "one species, level AND evolution-item together" precedent
  // Slowpoke already established (slowpoke -> slowbro @37 level, AND
  // slowpoke -> slowking via kings-rock). The player, not a hidden gender
  // value, decides which one their Kirlia becomes.
  kirlia: [{ method: "evolution-item", evolvesToSpeciesId: "gallade", itemId: "dawn-stone" }],
  // Dusclops (Hoenn, #356) -> Dusknoir: former
  // Trade-while-holding-Reaper-Cloth evolution — same precedent as Sneasel
  // above. Dusclops's own pre-existing evolution FROM Duskull is untouched.
  dusclops: [{ method: "evolution-item", evolvesToSpeciesId: "dusknoir", itemId: "reaper-cloth" }],
  // Snorunt (Hoenn, #361) -> Froslass: real-game Gender-restricted second
  // target (Dawn Stone, female only) — same "level AND evolution-item
  // together" simplification as Kirlia -> Gallade above. Snorunt's own
  // pre-existing level-42 evolution into Glalie is untouched.
  snorunt: [{ method: "evolution-item", evolvesToSpeciesId: "froslass", itemId: "dawn-stone" }],
  // Misdreavus (Johto, #200) -> Mismagius: real-game Dusk Stone evolution.
  misdreavus: [{ method: "evolution-item", evolvesToSpeciesId: "mismagius", itemId: "dusk-stone" }],
  // Murkrow (Johto, #198) -> Honchkrow: real-game Dusk Stone evolution —
  // same item as Misdreavus above, two independent species each with their
  // own single Dusk Stone branch.
  murkrow: [{ method: "evolution-item", evolvesToSpeciesId: "honchkrow", itemId: "dusk-stone" }],

  // Generation V (Unova, Phase 2) — every one of these is a real-game Stone
  // evolution already, kept as-is (never flattened to level, same rule
  // Vulpix/Growlithe/Gloom/Lombre/Nuzleaf already established) and every
  // itemId used here is one of the 16 EvolutionItemId values already in
  // this catalog — no new evolution item is introduced for Unova.
  pansage: [{ method: "evolution-item", evolvesToSpeciesId: "simisage", itemId: "leaf-stone" }],
  pansear: [{ method: "evolution-item", evolvesToSpeciesId: "simisear", itemId: "fire-stone" }],
  panpour: [{ method: "evolution-item", evolvesToSpeciesId: "simipour", itemId: "water-stone" }],
  munna: [{ method: "evolution-item", evolvesToSpeciesId: "musharna", itemId: "moon-stone" }],
  cottonee: [{ method: "evolution-item", evolvesToSpeciesId: "whimsicott", itemId: "sun-stone" }],
  petilil: [{ method: "evolution-item", evolvesToSpeciesId: "lilligant", itemId: "sun-stone" }],
  // Eelektrik (Unova, #603) -> Eelektross: real-game Thunder Stone
  // evolution — Eelektrik's own pre-existing level evolution FROM Tynamo
  // (LEVEL_EVOLUTIONS above) is untouched; the two tables stay mutually
  // exclusive per species (Eelektrik itself is absent from
  // LEVEL_EVOLUTIONS, same rule every other item-evolved species follows).
  eelektrik: [{ method: "evolution-item", evolvesToSpeciesId: "eelektross", itemId: "thunder-stone" }],
  minccino: [{ method: "evolution-item", evolvesToSpeciesId: "cinccino", itemId: "shiny-stone" }],
  // Lampent (Unova, #608) -> Chandelure: real-game Dusk Stone evolution —
  // Lampent's own pre-existing level evolution FROM Litwick (LEVEL_EVOLUTIONS
  // above) is untouched, same "mutually exclusive per species" rule as
  // Eelektrik above.
  lampent: [{ method: "evolution-item", evolvesToSpeciesId: "chandelure", itemId: "dusk-stone" }],

  // Generation VI (Kalos, Phase 2) — every one of these is either a
  // real-game Stone evolution kept as-is, or a former Trade-with-held-item
  // evolution simplified onto Shiny Stone per this phase's own explicit
  // spec (see LEVEL_EVOLUTIONS's own Kalos block note above for the full
  // rationale) — every itemId used here is one of the 16 EvolutionItemId
  // values already in this catalog; no new evolution item is introduced
  // for Kalos.
  // Floette (Kalos, #670) -> Florges: real-game Shiny Stone evolution —
  // Floette's own pre-existing level evolution FROM Flabébé (LEVEL_EVOLUTIONS
  // above) is untouched, same "mutually exclusive per species" rule as
  // Eelektrik/Lampent above.
  floette: [{ method: "evolution-item", evolvesToSpeciesId: "florges", itemId: "shiny-stone" }],
  // Doublade (Kalos, #680) -> Aegislash: real-game Dusk Stone evolution —
  // Doublade's own pre-existing level evolution FROM Honedge (LEVEL_EVOLUTIONS
  // above) is untouched.
  doublade: [{ method: "evolution-item", evolvesToSpeciesId: "aegislash", itemId: "dusk-stone" }],
  // Spritzee (Kalos, #682) -> Aromatisse: former Trade-while-holding-Sachet
  // evolution — simplified onto Shiny Stone (Sachet was never one of the
  // 16 kept Evolution Items, same "remap onto a shared existing product"
  // rule Electirizer/Magmarizer/Razor Claw/Razor Fang/Dubious Disc/Deep Sea
  // Tooth/Deep Sea Scale/Oval Stone already followed in the Evolution Item
  // Cleanup phase).
  spritzee: [{ method: "evolution-item", evolvesToSpeciesId: "aromatisse", itemId: "shiny-stone" }],
  // Swirlix (Kalos, #684) -> Slurpuff: former
  // Trade-while-holding-Whipped-Dream evolution — same remap rule as
  // Spritzee above, also onto Shiny Stone.
  swirlix: [{ method: "evolution-item", evolvesToSpeciesId: "slurpuff", itemId: "shiny-stone" }],
  // Helioptile (Kalos, #694) -> Heliolisk: uses Thunder Stone in this
  // project (design correction — not the real-game Sun Stone method),
  // reusing an existing catalog item, same as every other evolution-item
  // mapping in this file.
  helioptile: [{ method: "evolution-item", evolvesToSpeciesId: "heliolisk", itemId: "thunder-stone" }],

  // Generation VII (Alola, Phase 2) — Charjabug (Location, "level up at
  // Vast Poni Canyon" in the real game) now evolves directly from Thunder
  // Stone instead, reusing the existing item rather than introducing a new
  // one (Vikavolt is Electric-type, so Thunder Stone is a natural fit) —
  // Charjabug's own pre-existing level evolution FROM Grubbin
  // (LEVEL_EVOLUTIONS above) is untouched, same "mutually exclusive per
  // species" rule Eelektrik/Lampent/Floette/Doublade already follow.
  charjabug: [{ method: "evolution-item", evolvesToSpeciesId: "vikavolt", itemId: "thunder-stone" }],
  // Alolan Sandshrew/Vulpix — real-game Ice Stone evolutions, reusing the
  // same item their Sinnoh-introduced Eevee/Sneasel precedent already put
  // in this catalog; no new evolution item introduced.
  "sandshrew-alola": [{ method: "evolution-item", evolvesToSpeciesId: "sandslash-alola", itemId: "ice-stone" }],
  "vulpix-alola": [{ method: "evolution-item", evolvesToSpeciesId: "ninetales-alola", itemId: "ice-stone" }],
};

// Every evolution-item branch a species has, regardless of which item —
// used by the Inventory's eligibility list (features/evolution/services/
// evolution-item-eligibility.ts) to check a species against one particular
// selected item. Returns an empty array (never undefined) for a species
// with no evolution-item evolution at all, so callers can always
// `.find(...)` / `.some(...)` without a separate existence check.
export function getEvolutionItemEvolutions(speciesId: string): EvolutionItemEvolution[] {
  return EVOLUTION_ITEM_EVOLUTIONS[speciesId] ?? [];
}

// The one place a species' evolution for one EXACT item is ever resolved to
// a SINGLE result — correct for every species except Clamperl, whose Water
// Stone branch has two entries sharing that same itemId (see
// EVOLUTION_ITEM_EVOLUTIONS above): this function's plain .find() would
// silently return only the first one (Huntail), so any caller that must
// handle a species with more than one target per item (today, only
// Clamperl) needs getEvolutionItemEvolutionsByItem below instead. Returns
// undefined whenever the species has no evolution-item evolution at all, or
// has one but not for this particular item (e.g. Vulpix + Water Stone).
export function getEvolutionItemEvolutionByItem(speciesId: string, itemId: string): EvolutionItemEvolution | undefined {
  return getEvolutionItemEvolutions(speciesId).find((evolution) => evolution.itemId === itemId);
}

// Every evolution-item branch a species has for one EXACT item — usually
// zero or one entry, but genuinely two for Clamperl + Water Stone (Huntail
// and Gorebyss). This is the one function that can express an item-based
// BRANCH (the item-evolution equivalent of BRANCH_EVOLUTIONS' targets list
// above), so the Inventory eligibility filter and the accept-flow's own
// server-side validation both use this — never
// getEvolutionItemEvolutionByItem — whenever more than one target must be
// considered.
export function getEvolutionItemEvolutionsByItem(speciesId: string, itemId: string): EvolutionItemEvolution[] {
  return getEvolutionItemEvolutions(speciesId).filter((evolution) => evolution.itemId === itemId);
}

export interface EvolutionItemEvolutionEntry {
  speciesId: string;
  evolution: EvolutionItemEvolution;
}

// The one way to traverse the WHOLE Evolution-Item table (rather than
// looking up one species via getEvolutionItemEvolutions/
// getEvolutionItemEvolutionByItem above) — same "flat entries view over the
// single canonical table" idiom as getAllLevelEvolutionEntries above.
// Flattened because one species (Eevee) can have more than one branch.
export function getAllEvolutionItemEvolutionEntries(): EvolutionItemEvolutionEntry[] {
  return Object.entries(EVOLUTION_ITEM_EVOLUTIONS).flatMap(([speciesId, evolutions]) =>
    evolutions.map((evolution) => ({ speciesId, evolution }))
  );
}

// Every evolution-item id this game's evolution data knows about — exactly
// the 16 values EvolutionItemId allows, every one of them a real,
// purchasable Shop item (features/shop/data/shop-items.ts) at the same
// 70/35 buy/sell price (Evolution Item Cleanup phase: no more
// registry-only/not-yet-purchasable items — that in-between state was
// removed along with the eight retired item ids).
const EVOLUTION_ITEM_IDS: readonly EvolutionItemId[] = [
  "fire-stone",
  "water-stone",
  "thunder-stone",
  "leaf-stone",
  "sun-stone",
  "moon-stone",
  "ice-stone",
  "dawn-stone",
  "dusk-stone",
  "shiny-stone",
  "kings-rock",
  "metal-coat",
  "dragon-scale",
  "upgrade",
  "protector",
  "reaper-cloth",
];

// Narrows an arbitrary Shop/Inventory itemId to the EvolutionItemId union —
// the only place that narrowing happens, so a non-evolution-item itemId (a
// Poké Ball, a Potion) can never be trusted as an evolution item by the
// accept-flow's own server-side validation.
export function isEvolutionItemId(itemId: string): itemId is EvolutionItemId {
  return (EVOLUTION_ITEM_IDS as readonly string[]).includes(itemId);
}

// ============================================================================
// Branch Evolution (Evolution Simplification phase) — an explicit,
// player-chosen fork at a fixed level, never resolved automatically (no
// randomness, no server-clock/time-of-day, no friendship). Eevee is the
// only species that currently needs this: its former day/night Friendship
// split (Espeon/Umbreon) is replaced by a level-16 choice the player must
// make explicitly — see features/evolution/services/evolution-progress.
// service.ts's own doc comment and PlayerPokemon.pendingEvolutionBranch
// (prisma/schema.prisma) for the two-step create-choice/then-confirm flow
// this drives. `targets` is deliberately a plain array (not a fixed
// two-branch shape) so a future species with 3+ branches needs no schema
// or type change here — only a longer `targets` list.
export interface BranchEvolution {
  requiredLevel: number;
  targets: string[];
}

const BRANCH_EVOLUTIONS: Record<string, BranchEvolution> = {
  eevee: { requiredLevel: 16, targets: ["espeon", "umbreon"] },
  // Burmy's real-game evolution is Gender-restricted (male -> Mothim,
  // female -> Wormadam), always at level 20. Gender evolution is
  // forbidden, so — same as Wurmple/Nincada above — it becomes an explicit
  // player CHOICE between the two real targets instead of a hidden value.
  burmy: { requiredLevel: 20, targets: ["wormadam", "mothim"] },
  // Generation III (Hoenn, Phase 2) — Wurmple's real-game evolution is
  // decided by a hidden personality value the player never sees; this
  // project has no such hidden-value mechanic (and the phase spec
  // explicitly forbids introducing one), so it's an explicit level-7
  // player CHOICE instead — same deterministic, player-driven pattern
  // Eevee already established, reusing the exact same
  // create-choice/then-confirm flow (chooseEvolutionBranch,
  // EvolutionBranchChoiceDialog) with zero new mechanics.
  wurmple: { requiredLevel: 7, targets: ["silcoon", "cascoon"] },
  // Hoenn Evolution Cleanup — Nincada's real-game evolution normally
  // produces Ninjask AND a bonus Shedinja simultaneously (requires an empty
  // party slot + a spare Poké Ball at the moment of evolution). This
  // project's evolution architecture has no "one evolution produces two
  // Pokémon" mechanic for any method and never will — instead, Nincada is a
  // normal level-20 BRANCH: the player explicitly chooses exactly one of
  // Ninjask or Shedinja, which replaces Nincada in place, the same
  // single-target-replacement shape every other branch (and every other
  // evolution method) already uses. No free party slot, no Poké Ball, no
  // duplication, no special-case logic — Shedinja is simply another branch
  // target, resolved through the exact same create-choice/then-confirm flow
  // Eevee/Wurmple already use.
  nincada: { requiredLevel: 20, targets: ["ninjask", "shedinja"] },

  // Generation VII (Alola, Phase 2) — Rockruff's real-game evolution is
  // decided by a hidden time-of-day/version-exclusive/Own-Tempo-ability
  // value the player never explicitly picks; none of that is implemented
  // (and never will be — same "no hidden/random/time-based value" rule
  // Wurmple/Nincada above already established), so it's an explicit
  // level-25 player CHOICE between all three real targets instead — the
  // base/Midday Form entry (lycanroc), Midnight Form (lycanroc-midnight),
  // and Dusk Form (lycanroc-dusk), all three ALREADY independent species
  // ids in the catalog (Alola Phase 1's own Forms work, generation-7-
  // pokemon-data.ts) since a Form is just a different appearance of the
  // same National Dex entry (#745) — reusing that existing id here is not
  // a new mechanic, just BRANCH_EVOLUTIONS' first 3-target example (every
  // prior branch above has exactly 2).
  rockruff: { requiredLevel: 25, targets: ["lycanroc", "lycanroc-midnight", "lycanroc-dusk"] },
  // Cosmoem's real-game evolution into Solgaleo or Lunala is decided by
  // which game version the cartridge is (Sun -> Solgaleo, Moon -> Lunala),
  // a mechanic this single-build project has no equivalent of — same "no
  // version-exclusive/day-night/random value" rule as Rockruff above, so
  // it's an explicit level-53 player CHOICE between both real targets
  // instead. Cosmog -> Cosmoem itself stays a normal level-43 evolution
  // (LEVEL_EVOLUTIONS above) — only the second stage is a branch.
  cosmoem: { requiredLevel: 53, targets: ["solgaleo", "lunala"] },
  // Cubone's real-game evolution into Marowak is a plain level-28
  // evolution with no branch at all in the source games; Alola Phase 2
  // adds Alolan Marowak as a second, equally valid target reachable at the
  // SAME level, migrated here from LEVEL_EVOLUTIONS (which used to hold
  // cubone -> marowak @28 as a single-target entry — see that table's own
  // note at the old cubone key) rather than duplicating a second,
  // conflicting Cubone evolution definition. The level-28 threshold itself
  // is unchanged; only the table (and therefore the resolution shape —
  // single target vs. explicit choice) changed. No night/region/randomness
  // condition of any kind decides between the two — the player always
  // explicitly picks.
  cubone: { requiredLevel: 28, targets: ["marowak", "marowak-alola"] },
};

// The one place a species' Branch Evolution is ever looked up — mirrors
// getLevelEvolution's own "undefined means no evolution of this method"
// contract. Eevee is deliberately present here in ADDITION to its own three
// EVOLUTION_ITEM_EVOLUTIONS branches above — one species can have evolution
// options across more than one method/table, exactly like the real games.
export function getBranchEvolution(speciesId: string): BranchEvolution | undefined {
  return BRANCH_EVOLUTIONS[speciesId];
}

// ============================================================================
// Stat-Branch Evolution (Phase 2, Generation II) — Tyrogue only
// ============================================================================
export interface LevelStatEvolution {
  method: "level-stat";
  requiredLevel: number;
  attackGreaterTarget: string;
  attackLessTarget: string;
  equalTarget: string;
}

const LEVEL_STAT_EVOLUTIONS: Record<string, LevelStatEvolution> = {
  tyrogue: {
    method: "level-stat",
    requiredLevel: 20,
    attackGreaterTarget: "hitmonlee",
    attackLessTarget: "hitmonchan",
    equalTarget: "hitmontop",
  },
};

export function getLevelStatEvolution(speciesId: string): LevelStatEvolution | undefined {
  return LEVEL_STAT_EVOLUTIONS[speciesId];
}

// The one place a LevelStatEvolution is ever resolved down to a single
// concrete target species id — always from the owned Pokémon's own actual
// CALCULATED Attack/Defense stats (engine/battle/pokemon-stat-calculations.ts's
// calculatePokemonNonHpStat, the same formula every other stat consumer
// uses) at the moment the decision is made, never chosen randomly.
export function resolveLevelStatEvolutionTarget(evolution: LevelStatEvolution, attackStat: number, defenseStat: number): string {
  if (attackStat > defenseStat) return evolution.attackGreaterTarget;
  if (attackStat < defenseStat) return evolution.attackLessTarget;
  return evolution.equalTarget;
}

// ============================================================================
// Canonical cross-method query surface
// ============================================================================
//
// A discriminated union over every evolution method this file supports.
// Each variant's shape matches exactly what its own table above already
// stores; this type is never a second/duplicated definition of any of
// them, only a common view over all of them together.
export type PokemonEvolution =
  | ({ method: "level" } & LevelEvolution)
  | LevelStatEvolution
  | EvolutionItemEvolution
  | ({ method: "branch" } & BranchEvolution);

// The one place every evolution option for a species — across every method
// this file knows about — is ever gathered into a single list. Read-only
// and purely additive over the per-method tables above; never itself a
// second catalog. Used by any future UI/service that wants to show "how can
// this Pokémon evolve" without knowing which method table(s) to check.
export function getEvolutionOptions(speciesId: string): PokemonEvolution[] {
  const options: PokemonEvolution[] = [];

  const level = getLevelEvolution(speciesId);
  if (level) options.push({ method: "level", ...level });

  const levelStat = getLevelStatEvolution(speciesId);
  if (levelStat) options.push(levelStat);

  options.push(...getEvolutionItemEvolutions(speciesId));

  const branch = getBranchEvolution(speciesId);
  if (branch) options.push({ method: "branch", ...branch });

  return options;
}

// The one place "what SHOULD this Pokémon's pending-evolution decision be
// right now, if anything" is ever computed — shared by BOTH
// tryCreatePendingEvolution (features/evolution/services/evolution-progress.
// service.ts, which CREATES the pending decision) and acceptEvolution
// (features/evolution/services/accept-evolution.service.ts, which
// RE-VALIDATES it at accept time via isPendingEvolutionTargetValid below),
// so the two can never disagree about what counts as canonical. Deliberately
// covers only the three METHODS that use the shared pendingEvolutionSpeciesId/
// pendingEvolutionBranch/evolutionPermanentlyBlocked confirmation flow
// (level, level-stat, branch) — evolution-item is its own independent,
// non-pending, Inventory-initiated flow and is never consulted here.
//
// Checked in a fixed order (level, then level-stat, then branch) purely
// because no species in this catalog has more than one of these three
// methods defined for itself at once — never a priority rule that actually
// has to break a real tie.
export interface PendingEvolutionEligibilityInput {
  speciesId: string;
  level: number;
  attackStat: number;
  defenseStat: number;
}

export type PendingEvolutionEligibility =
  | { kind: "single"; targetSpeciesId: string }
  | { kind: "branch"; targets: string[] };

export function resolvePendingEvolutionEligibility(input: PendingEvolutionEligibilityInput): PendingEvolutionEligibility | null {
  const { speciesId, level, attackStat, defenseStat } = input;

  const levelEvolution = getLevelEvolution(speciesId);
  if (levelEvolution && level >= levelEvolution.requiredLevel) {
    return { kind: "single", targetSpeciesId: levelEvolution.evolvesToSpeciesId };
  }

  const levelStatEvolution = getLevelStatEvolution(speciesId);
  if (levelStatEvolution && level >= levelStatEvolution.requiredLevel) {
    return { kind: "single", targetSpeciesId: resolveLevelStatEvolutionTarget(levelStatEvolution, attackStat, defenseStat) };
  }

  const branchEvolution = getBranchEvolution(speciesId);
  if (branchEvolution && level >= branchEvolution.requiredLevel) {
    return { kind: "branch", targets: branchEvolution.targets };
  }

  return null;
}

// Accept-time re-validation for a single already-decided target — true
// when `candidateTargetSpeciesId` is exactly what resolvePendingEvolutionEligibility
// says this Pokémon's current level/stats canonically allow right now,
// whether that came from a single-target method (level, level-stat) or was
// one specific member of a branch's own target list (i.e. the player
// already chose it via chooseEvolutionBranch — see evolution-progress.
// service.ts). Never trusts the stored pendingEvolutionSpeciesId column by
// itself; always re-derives against this same canonical resolver.
export function isPendingEvolutionTargetValid(
  input: PendingEvolutionEligibilityInput,
  candidateTargetSpeciesId: string
): boolean {
  const eligibility = resolvePendingEvolutionEligibility(input);
  if (!eligibility) return false;

  return eligibility.kind === "single"
    ? eligibility.targetSpeciesId === candidateTargetSpeciesId
    : eligibility.targets.includes(candidateTargetSpeciesId);
}

// Future Trading note (Evolution Simplification phase): a future
// player-to-player trading feature will let players exchange Pokémon and
// items as a social/economy feature. Trading is deliberately independent
// from evolution — nothing in this file, or anywhere else in the evolution
// feature, is ever triggered by a trade. Every evolution that used to
// require a trade now either evolves by level (see the "former Trade
// evolutions" entries in LEVEL_EVOLUTIONS above) or directly from an item
// with no trade involved (EVOLUTION_ITEM_EVOLUTIONS above).
