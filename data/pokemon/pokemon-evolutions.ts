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
// Scope (Phase — Level-Based Evolution only): every entry below is a real,
// unconditional level-up evolution from the mainline games. Every species
// whose only canonical evolution requires a Stone (e.g. vulpix, growlithe,
// poliwhirl, gloom, weepinbell, exeggcute, shellder, eevee), a Trade (e.g.
// kadabra, machoke, graveler, haunter), Friendship, or a special
// location/time is deliberately left out of this table entirely — an
// absent entry is exactly how "this species has no *level* evolution (yet)"
// is expressed, so eligibility lookups never need a separate
// method-filtering step.
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
  machop: { evolvesToSpeciesId: "machoke", requiredLevel: 28 },
  bellsprout: { evolvesToSpeciesId: "weepinbell", requiredLevel: 21 },
  tentacool: { evolvesToSpeciesId: "tentacruel", requiredLevel: 30 },
  geodude: { evolvesToSpeciesId: "graveler", requiredLevel: 25 },
  ponyta: { evolvesToSpeciesId: "rapidash", requiredLevel: 40 },
  slowpoke: { evolvesToSpeciesId: "slowbro", requiredLevel: 37 },
  magnemite: { evolvesToSpeciesId: "magneton", requiredLevel: 30 },
  doduo: { evolvesToSpeciesId: "dodrio", requiredLevel: 31 },
  seel: { evolvesToSpeciesId: "dewgong", requiredLevel: 34 },
  grimer: { evolvesToSpeciesId: "muk", requiredLevel: 38 },
  gastly: { evolvesToSpeciesId: "haunter", requiredLevel: 25 },
  drowzee: { evolvesToSpeciesId: "hypno", requiredLevel: 26 },
  krabby: { evolvesToSpeciesId: "kingler", requiredLevel: 28 },
  voltorb: { evolvesToSpeciesId: "electrode", requiredLevel: 30 },
  cubone: { evolvesToSpeciesId: "marowak", requiredLevel: 28 },
  koffing: { evolvesToSpeciesId: "weezing", requiredLevel: 35 },
  rhyhorn: { evolvesToSpeciesId: "rhydon", requiredLevel: 42 },
  horsea: { evolvesToSpeciesId: "seadra", requiredLevel: 32 },
  goldeen: { evolvesToSpeciesId: "seaking", requiredLevel: 33 },
  magikarp: { evolvesToSpeciesId: "gyarados", requiredLevel: 20 },
  omanyte: { evolvesToSpeciesId: "omastar", requiredLevel: 40 },
  kabuto: { evolvesToSpeciesId: "kabutops", requiredLevel: 40 },
  dratini: { evolvesToSpeciesId: "dragonair", requiredLevel: 30 },
  dragonair: { evolvesToSpeciesId: "dragonite", requiredLevel: 55 },
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
