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
// Shop's own canonical item ids (features/shop/data/shop-items.ts) when the
// item is actually purchasable — see isEvolutionItemId's own doc comment
// for which of these are not yet obtainable — never a duplicated/derived
// id, so an evolution-item lookup and an inventory quantity check always
// agree on what "this item" means.
//
// One species can have more than one evolution-item branch (Eevee's three
// elemental stones, Gloom's two), so every entry is an array — a single-item
// species just has one element. Every species below is deliberately absent
// from LEVEL_EVOLUTIONS (see that table's own scope note) — the two tables
// are mutually exclusive per species, so a lookup never has to choose
// between a level and an evolution-item result for the same species.
export type EvolutionItemId =
  | "fire-stone"
  | "water-stone"
  | "thunder-stone"
  | "leaf-stone"
  | "sun-stone"
  | "kings-rock"
  | "metal-coat"
  | "dragon-scale"
  | "upgrade";

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
  pikachu: [{ method: "evolution-item", evolvesToSpeciesId: "raichu", itemId: "thunder-stone" }],
  gloom: [
    { method: "evolution-item", evolvesToSpeciesId: "vileplume", itemId: "leaf-stone" },
    // Generation II (Phase 2) — Gloom's second, independent stone branch:
    // Sun Stone instead of Leaf Stone. Same "one species, multiple
    // evolution-item branches" shape Eevee already established below, just
    // with two branches instead of three.
    { method: "evolution-item", evolvesToSpeciesId: "bellossom", itemId: "sun-stone" },
  ],
  weepinbell: [{ method: "evolution-item", evolvesToSpeciesId: "victreebel", itemId: "leaf-stone" }],
  exeggcute: [{ method: "evolution-item", evolvesToSpeciesId: "exeggutor", itemId: "leaf-stone" }],
  eevee: [
    { method: "evolution-item", evolvesToSpeciesId: "flareon", itemId: "fire-stone" },
    { method: "evolution-item", evolvesToSpeciesId: "vaporeon", itemId: "water-stone" },
    { method: "evolution-item", evolvesToSpeciesId: "jolteon", itemId: "thunder-stone" },
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

// The one place a species' evolution for one EXACT item is ever resolved —
// used both by the client-side eligibility filter and, authoritatively, by
// accept-evolution-item.service.ts's server-side re-validation. Returns
// undefined whenever the species has no evolution-item evolution at all, or
// has one but not for this particular item (e.g. Vulpix + Water Stone).
export function getEvolutionItemEvolutionByItem(speciesId: string, itemId: string): EvolutionItemEvolution | undefined {
  return getEvolutionItemEvolutions(speciesId).find((evolution) => evolution.itemId === itemId);
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

// Every evolution-item id this game's evolution data knows about, whether
// or not the Shop currently sells it. fire-stone/water-stone/thunder-stone/
// leaf-stone are real, purchasable Shop items (features/shop/data/
// shop-items.ts). sun-stone/kings-rock/metal-coat/dragon-scale/upgrade are
// NOT in the Shop catalog today — their evolution data and eligibility path
// both already work correctly the moment a player owns one (matching this
// project's own pre-existing "acceptable for the evolution definition to
// exist before the item becomes purchasable" precedent, first established
// for sun-stone in Phase 2) — see this phase's own final report for the
// full obtainability list. No price is ever invented here for an
// unobtainable item; adding one to the Shop is a separate, deliberate
// decision this file never makes on its own.
const EVOLUTION_ITEM_IDS: readonly EvolutionItemId[] = [
  "fire-stone",
  "water-stone",
  "thunder-stone",
  "leaf-stone",
  "sun-stone",
  "kings-rock",
  "metal-coat",
  "dragon-scale",
  "upgrade",
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
