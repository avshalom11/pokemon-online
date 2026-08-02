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

// Stone-Based Evolution — the second (and, for this phase, last) evolution
// method alongside LEVEL_EVOLUTIONS above, kept in this same canonical file
// rather than a second catalog. `stoneItemId` is always one of the Shop's
// own canonical Stone item ids (features/shop/data/shop-items.ts) — never a
// duplicated/derived id — so a stone-evolution lookup and an inventory
// quantity check always agree on what "this stone" means.
//
// One species can have more than one stone branch (Eevee only, in this
// phase), so every entry is an array — a single-stone species just has one
// element. Every species below is deliberately absent from LEVEL_EVOLUTIONS
// (see that table's own scope note) — the two tables are mutually
// exclusive per species in this phase, so a lookup never has to choose
// between a level and a stone result for the same species.
export type EvolutionStoneId = "fire-stone" | "water-stone" | "thunder-stone" | "leaf-stone";

export interface StoneEvolution {
  method: "stone";
  evolvesToSpeciesId: string;
  stoneItemId: EvolutionStoneId;
}

const STONE_EVOLUTIONS: Record<string, StoneEvolution[]> = {
  vulpix: [{ method: "stone", evolvesToSpeciesId: "ninetales", stoneItemId: "fire-stone" }],
  growlithe: [{ method: "stone", evolvesToSpeciesId: "arcanine", stoneItemId: "fire-stone" }],
  poliwhirl: [{ method: "stone", evolvesToSpeciesId: "poliwrath", stoneItemId: "water-stone" }],
  shellder: [{ method: "stone", evolvesToSpeciesId: "cloyster", stoneItemId: "water-stone" }],
  staryu: [{ method: "stone", evolvesToSpeciesId: "starmie", stoneItemId: "water-stone" }],
  pikachu: [{ method: "stone", evolvesToSpeciesId: "raichu", stoneItemId: "thunder-stone" }],
  gloom: [{ method: "stone", evolvesToSpeciesId: "vileplume", stoneItemId: "leaf-stone" }],
  weepinbell: [{ method: "stone", evolvesToSpeciesId: "victreebel", stoneItemId: "leaf-stone" }],
  exeggcute: [{ method: "stone", evolvesToSpeciesId: "exeggutor", stoneItemId: "leaf-stone" }],
  eevee: [
    { method: "stone", evolvesToSpeciesId: "flareon", stoneItemId: "fire-stone" },
    { method: "stone", evolvesToSpeciesId: "vaporeon", stoneItemId: "water-stone" },
    { method: "stone", evolvesToSpeciesId: "jolteon", stoneItemId: "thunder-stone" },
  ],
};

// Every stone branch a species has, regardless of which stone — used by the
// Inventory's eligibility list (features/evolution/services/
// stone-evolution-eligibility.ts) to check a species against one particular
// selected stone. Returns an empty array (never undefined) for a species
// with no stone evolution at all, so callers can always `.find(...)` /
// `.some(...)` without a separate existence check.
export function getStoneEvolutions(speciesId: string): StoneEvolution[] {
  return STONE_EVOLUTIONS[speciesId] ?? [];
}

// The one place a species' evolution for one EXACT stone is ever resolved —
// used both by the client-side eligibility filter and, authoritatively, by
// accept-stone-evolution.service.ts's server-side re-validation. Returns
// undefined whenever the species has no stone evolution at all, or has one
// but not for this particular stone (e.g. Vulpix + Water Stone).
export function getStoneEvolutionByItem(speciesId: string, stoneItemId: string): StoneEvolution | undefined {
  return getStoneEvolutions(speciesId).find((evolution) => evolution.stoneItemId === stoneItemId);
}

export interface StoneEvolutionEntry {
  speciesId: string;
  evolution: StoneEvolution;
}

// The one way to traverse the WHOLE Stone Evolution table (rather than
// looking up one species via getStoneEvolutions/getStoneEvolutionByItem
// above) — same "flat entries view over the single canonical table" idiom
// as getAllLevelEvolutionEntries above. Flattened because one species
// (Eevee) can have more than one stone branch. Used by
// engine/encounter-rarity to derive "every species reachable only via a
// stone evolution" without a second/duplicated species list.
export function getAllStoneEvolutionEntries(): StoneEvolutionEntry[] {
  return Object.entries(STONE_EVOLUTIONS).flatMap(([speciesId, evolutions]) =>
    evolutions.map((evolution) => ({ speciesId, evolution }))
  );
}

const EVOLUTION_STONE_ITEM_IDS: readonly EvolutionStoneId[] = ["fire-stone", "water-stone", "thunder-stone", "leaf-stone"];

// Narrows an arbitrary Shop/Inventory itemId to the EvolutionStoneId union —
// the only place that narrowing happens, so a non-stone itemId (a Poké Ball,
// a Potion) can never be trusted as a stone by the accept-flow's own
// server-side validation.
export function isEvolutionStoneItemId(itemId: string): itemId is EvolutionStoneId {
  return (EVOLUTION_STONE_ITEM_IDS as readonly string[]).includes(itemId);
}
