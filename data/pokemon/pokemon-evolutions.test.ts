// Focused regression tests for the evolution data tables (Level,
// Evolution-Item, Branch, Level-Stat) — deliberately small (per this
// phase's own "essential tests only" instruction): one test per rule that
// would silently break the feature, not exhaustive coverage of the whole
// species roster.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getLevelEvolution,
  getAllLevelEvolutionEntries,
  getEvolutionItemEvolutionByItem,
  getEvolutionItemEvolutions,
  getAllEvolutionItemEvolutionEntries,
  isEvolutionItemId,
  getBranchEvolution,
  getLevelStatEvolution,
  resolveLevelStatEvolutionTarget,
  resolvePendingEvolutionEligibility,
  isPendingEvolutionTargetValid,
} from "./pokemon-evolutions.ts";
import { POKEMON_DATA } from "./pokemon-data.ts";
import { deriveSpeciesWildLevelRange } from "@/engine/evolution-stage-scaling/species-wild-level-range";

test("a species evolves only with its own canonical item, never a different one", () => {
  assert.equal(getEvolutionItemEvolutionByItem("vulpix", "fire-stone")?.evolvesToSpeciesId, "ninetales");
  assert.equal(getEvolutionItemEvolutionByItem("vulpix", "water-stone"), undefined);
  assert.equal(getEvolutionItemEvolutionByItem("vulpix", "thunder-stone"), undefined);
  assert.equal(getEvolutionItemEvolutionByItem("vulpix", "leaf-stone"), undefined);
});

test("Eevee supports its three original canonical stone branches (Espeon/Umbreon are a Branch choice, not an item)", () => {
  // Generation IV (Sinnoh, Phase 2 design correction) added two more
  // evolution-item branches to Eevee (leaf-stone/ice-stone -> Leafeon/
  // Glaceon) — see this file's own dedicated Eevee evolution-item test
  // further down for the full five-branch count; this test only re-checks
  // the three original Kanto-era branches are still intact and unchanged.
  assert.equal(getEvolutionItemEvolutionByItem("eevee", "fire-stone")?.evolvesToSpeciesId, "flareon");
  assert.equal(getEvolutionItemEvolutionByItem("eevee", "water-stone")?.evolvesToSpeciesId, "vaporeon");
  assert.equal(getEvolutionItemEvolutionByItem("eevee", "thunder-stone")?.evolvesToSpeciesId, "jolteon");
});

test("a species with no evolution-item evolution returns an empty list, never undefined", () => {
  assert.deepEqual(getEvolutionItemEvolutions("charmander"), []);
  assert.equal(getEvolutionItemEvolutionByItem("charmander", "fire-stone"), undefined);
});

test("evolution-item species are never also present in the Level Evolution table", () => {
  // Slowpoke is deliberately excluded here — unlike the others below, it
  // has BOTH its own pre-existing, unrelated Gen1 level evolution
  // (slowpoke -> slowbro @ 37) AND a new King's Rock evolution-item branch
  // (slowpoke -> slowking) — the same "one species, multiple evolution
  // methods" precedent Eevee/Gloom already established, covered by its own
  // dedicated test below.
  const itemOnlySpecies = ["vulpix", "growlithe", "poliwhirl", "shellder", "staryu", "pikachu", "gloom", "weepinbell", "exeggcute", "eevee", "onix", "scyther", "seadra", "porygon"];

  for (const speciesId of itemOnlySpecies) {
    assert.equal(getLevelEvolution(speciesId), undefined, `${speciesId} must have no level evolution entry`);
  }
});

test("isEvolutionItemId recognizes all twelve canonical evolution-item ids, including Moon Stone", () => {
  assert.equal(isEvolutionItemId("fire-stone"), true);
  assert.equal(isEvolutionItemId("water-stone"), true);
  assert.equal(isEvolutionItemId("thunder-stone"), true);
  assert.equal(isEvolutionItemId("leaf-stone"), true);
  assert.equal(isEvolutionItemId("sun-stone"), true);
  assert.equal(isEvolutionItemId("kings-rock"), true);
  assert.equal(isEvolutionItemId("metal-coat"), true);
  assert.equal(isEvolutionItemId("dragon-scale"), true);
  assert.equal(isEvolutionItemId("upgrade"), true);
  assert.equal(isEvolutionItemId("deep-sea-tooth"), true);
  assert.equal(isEvolutionItemId("deep-sea-scale"), true);
  assert.equal(isEvolutionItemId("moon-stone"), true);
  assert.equal(isEvolutionItemId("poke-ball"), false);
});

test("Gloom has two independent Sun/Leaf Stone branches; Sunkern is Sun-Stone-only and never a level evolution", () => {
  assert.equal(getEvolutionItemEvolutionByItem("gloom", "leaf-stone")?.evolvesToSpeciesId, "vileplume");
  assert.equal(getEvolutionItemEvolutionByItem("gloom", "sun-stone")?.evolvesToSpeciesId, "bellossom");
  assert.equal(getEvolutionItemEvolutionByItem("sunkern", "sun-stone")?.evolvesToSpeciesId, "sunflora");
  assert.equal(getLevelEvolution("sunkern"), undefined, "Sunkern must never be a level evolution");
});

test("former Trade-item evolutions now evolve directly from their item, no trade involved", () => {
  assert.equal(getEvolutionItemEvolutionByItem("onix", "metal-coat")?.evolvesToSpeciesId, "steelix");
  assert.equal(getEvolutionItemEvolutionByItem("scyther", "metal-coat")?.evolvesToSpeciesId, "scizor");
  assert.equal(getEvolutionItemEvolutionByItem("seadra", "dragon-scale")?.evolvesToSpeciesId, "kingdra");
  assert.equal(getEvolutionItemEvolutionByItem("porygon", "upgrade")?.evolvesToSpeciesId, "porygon2");
  assert.equal(getEvolutionItemEvolutionByItem("slowpoke", "kings-rock")?.evolvesToSpeciesId, "slowking");

  // Poliwhirl keeps its own independent Water Stone branch alongside its
  // new King's Rock branch — same multi-item-per-species precedent as
  // Eevee/Gloom.
  assert.equal(getEvolutionItemEvolutionByItem("poliwhirl", "water-stone")?.evolvesToSpeciesId, "poliwrath");
  assert.equal(getEvolutionItemEvolutionByItem("poliwhirl", "kings-rock")?.evolvesToSpeciesId, "politoed");
});

test("Generation II level evolutions are present with their canonical required levels", () => {
  assert.equal(getLevelEvolution("chikorita")?.requiredLevel, 16);
  assert.equal(getLevelEvolution("chikorita")?.evolvesToSpeciesId, "bayleef");
  assert.equal(getLevelEvolution("bayleef")?.requiredLevel, 32);
  assert.equal(getLevelEvolution("pupitar")?.requiredLevel, 55);
  assert.equal(getLevelEvolution("pupitar")?.evolvesToSpeciesId, "tyranitar");
});

test("former Friendship evolutions are now plain level-16 evolutions", () => {
  assert.deepEqual(getLevelEvolution("pichu"), { evolvesToSpeciesId: "pikachu", requiredLevel: 16 });
  assert.deepEqual(getLevelEvolution("cleffa"), { evolvesToSpeciesId: "clefairy", requiredLevel: 16 });
  assert.deepEqual(getLevelEvolution("igglybuff"), { evolvesToSpeciesId: "jigglypuff", requiredLevel: 16 });
  assert.deepEqual(getLevelEvolution("togepi"), { evolvesToSpeciesId: "togetic", requiredLevel: 16 });
  assert.deepEqual(getLevelEvolution("chansey"), { evolvesToSpeciesId: "blissey", requiredLevel: 16 });
});

test("Golbat -> Crobat is level 36, not 16, to avoid colliding with Zubat's own real level-22 evolution into Golbat", () => {
  assert.deepEqual(getLevelEvolution("zubat"), { evolvesToSpeciesId: "golbat", requiredLevel: 22 });
  assert.deepEqual(getLevelEvolution("golbat"), { evolvesToSpeciesId: "crobat", requiredLevel: 36 });
});

test("former plain Trade evolutions are now plain level-36 evolutions", () => {
  assert.deepEqual(getLevelEvolution("haunter"), { evolvesToSpeciesId: "gengar", requiredLevel: 36 });
  assert.deepEqual(getLevelEvolution("kadabra"), { evolvesToSpeciesId: "alakazam", requiredLevel: 36 });
  assert.deepEqual(getLevelEvolution("machoke"), { evolvesToSpeciesId: "machamp", requiredLevel: 36 });
  assert.deepEqual(getLevelEvolution("graveler"), { evolvesToSpeciesId: "golem", requiredLevel: 36 });
});

test("Eevee is an explicit level-16 Branch choice between Espeon and Umbreon only, never automatic", () => {
  const branch = getBranchEvolution("eevee");
  assert.equal(branch?.requiredLevel, 16);
  assert.deepEqual(branch?.targets, ["espeon", "umbreon"]);
  assert.equal(getBranchEvolution("pikachu"), undefined, "only Eevee has a Branch Evolution today");
});

test("Tyrogue resolves to Hitmonlee/Hitmonchan/Hitmontop from Attack vs Defense, never randomly", () => {
  const tyrogue = getLevelStatEvolution("tyrogue")!;
  assert.equal(resolveLevelStatEvolutionTarget(tyrogue, 50, 30), "hitmonlee");
  assert.equal(resolveLevelStatEvolutionTarget(tyrogue, 30, 50), "hitmonchan");
  assert.equal(resolveLevelStatEvolutionTarget(tyrogue, 40, 40), "hitmontop");
});

test("resolvePendingEvolutionEligibility only returns a result once its own method's threshold is met", () => {
  assert.equal(resolvePendingEvolutionEligibility({ speciesId: "chikorita", level: 15, attackStat: 0, defenseStat: 0 }), null);
  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "chikorita", level: 16, attackStat: 0, defenseStat: 0 }), {
    kind: "single",
    targetSpeciesId: "bayleef",
  });
  assert.equal(resolvePendingEvolutionEligibility({ speciesId: "golbat", level: 35, attackStat: 0, defenseStat: 0 }), null);
  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "golbat", level: 36, attackStat: 0, defenseStat: 0 }), {
    kind: "single",
    targetSpeciesId: "crobat",
  });
});

test("resolvePendingEvolutionEligibility returns a branch result (never a single target) for Eevee at level 16", () => {
  assert.equal(resolvePendingEvolutionEligibility({ speciesId: "eevee", level: 15, attackStat: 0, defenseStat: 0 }), null);
  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "eevee", level: 16, attackStat: 0, defenseStat: 0 }), {
    kind: "branch",
    targets: ["espeon", "umbreon"],
  });
});

test("isPendingEvolutionTargetValid accepts a single-target match and rejects everything else", () => {
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "chikorita", level: 16, attackStat: 0, defenseStat: 0 }, "bayleef"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "chikorita", level: 16, attackStat: 0, defenseStat: 0 }, "meganium"), false);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "chikorita", level: 15, attackStat: 0, defenseStat: 0 }, "bayleef"), false);
});

test("isPendingEvolutionTargetValid accepts either already-chosen Eevee branch target, never a third species", () => {
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "eevee", level: 16, attackStat: 0, defenseStat: 0 }, "espeon"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "eevee", level: 16, attackStat: 0, defenseStat: 0 }, "umbreon"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "eevee", level: 16, attackStat: 0, defenseStat: 0 }, "flareon"), false);
});

// ============================================================================
// Whole-table integrity — catalog-wide invariants (Generation III/Hoenn,
// Phase 2, exercises the whole table including Kanto/Johto, since these
// rules are supposed to hold universally, not just for the newly-added
// Hoenn entries).
// ============================================================================

const SPECIES_IDS = new Set(POKEMON_DATA.map((species) => species.id));

test("no duplicate evolution definitions: no species is a key in more than one of LEVEL_EVOLUTIONS/BRANCH_EVOLUTIONS", () => {
  const levelIds = getAllLevelEvolutionEntries().map((entry) => entry.speciesId);
  for (const speciesId of levelIds) {
    assert.equal(getBranchEvolution(speciesId), undefined, `${speciesId} has both a level evolution and a branch evolution`);
  }
});

test("every level-evolution target exists in the species catalog", () => {
  for (const { speciesId, evolution } of getAllLevelEvolutionEntries()) {
    assert.ok(SPECIES_IDS.has(evolution.evolvesToSpeciesId), `${speciesId} -> "${evolution.evolvesToSpeciesId}" does not resolve to a real species`);
  }
});

test("every evolution-item evolution target exists in the species catalog, and every itemId is a recognized EvolutionItemId", () => {
  for (const { speciesId, evolution } of getAllEvolutionItemEvolutionEntries()) {
    assert.ok(SPECIES_IDS.has(evolution.evolvesToSpeciesId), `${speciesId} -> "${evolution.evolvesToSpeciesId}" does not resolve to a real species`);
    assert.ok(isEvolutionItemId(evolution.itemId), `${speciesId}'s itemId "${evolution.itemId}" is not a recognized EvolutionItemId`);
  }
});

test("every branch-evolution target exists in the species catalog", () => {
  for (const speciesId of ["eevee", "wurmple", "nincada"]) {
    const branch = getBranchEvolution(speciesId)!;
    for (const targetId of branch.targets) {
      assert.ok(SPECIES_IDS.has(targetId), `${speciesId}'s branch target "${targetId}" does not resolve to a real species`);
    }
  }
});

// ============================================================================
// Generation III (Hoenn, Phase 2)
// ============================================================================

test("every Hoenn starter line is complete: level 16 then level 36 for all three lines", () => {
  const lines: [string, string, string][] = [
    ["treecko", "grovyle", "sceptile"],
    ["torchic", "combusken", "blaziken"],
    ["mudkip", "marshtomp", "swampert"],
  ];

  for (const [base, middle, final] of lines) {
    assert.deepEqual(getLevelEvolution(base), { evolvesToSpeciesId: middle, requiredLevel: 16 }, `${base} -> ${middle}`);
    assert.deepEqual(getLevelEvolution(middle), { evolvesToSpeciesId: final, requiredLevel: 36 }, `${middle} -> ${final}`);
    assert.equal(getLevelEvolution(final), undefined, `${final} is a final evolution and must have no further level evolution`);
  }
});

test("Wurmple is an explicit level-7 Branch choice between Silcoon and Cascoon, never a hidden personality value", () => {
  const branch = getBranchEvolution("wurmple");
  assert.equal(branch?.requiredLevel, 7);
  assert.deepEqual(branch?.targets, ["silcoon", "cascoon"]);
  assert.equal(getLevelEvolution("wurmple"), undefined, "Wurmple must never also have a level evolution entry");

  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "wurmple", level: 6, attackStat: 0, defenseStat: 0 }), null);
  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "wurmple", level: 7, attackStat: 0, defenseStat: 0 }), {
    kind: "branch",
    targets: ["silcoon", "cascoon"],
  });
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "wurmple", level: 7, attackStat: 0, defenseStat: 0 }, "silcoon"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "wurmple", level: 7, attackStat: 0, defenseStat: 0 }, "cascoon"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "wurmple", level: 7, attackStat: 0, defenseStat: 0 }, "beautifly"), false);
});

test("Silcoon -> Beautifly and Cascoon -> Dustox are each a plain level-10 evolution, independent of the Wurmple branch choice", () => {
  assert.deepEqual(getLevelEvolution("silcoon"), { evolvesToSpeciesId: "beautifly", requiredLevel: 10 });
  assert.deepEqual(getLevelEvolution("cascoon"), { evolvesToSpeciesId: "dustox", requiredLevel: 10 });
});

test("Lombre -> Ludicolo (Water Stone) and Nuzleaf -> Shiftry (Leaf Stone) keep their real-game Stone methods, never flattened to level", () => {
  assert.equal(getEvolutionItemEvolutionByItem("lombre", "water-stone")?.evolvesToSpeciesId, "ludicolo");
  assert.equal(getLevelEvolution("lombre"), undefined);
  assert.equal(getEvolutionItemEvolutionByItem("nuzleaf", "leaf-stone")?.evolvesToSpeciesId, "shiftry");
  assert.equal(getLevelEvolution("nuzleaf"), undefined);
});

test("Clamperl evolves via two independent Deep Sea items, never a trade", () => {
  const branches = getEvolutionItemEvolutions("clamperl");
  const byItem = Object.fromEntries(branches.map((branch) => [branch.itemId, branch.evolvesToSpeciesId]));

  assert.equal(branches.length, 2);
  assert.equal(byItem["deep-sea-tooth"], "huntail");
  assert.equal(byItem["deep-sea-scale"], "gorebyss");
  assert.equal(getLevelEvolution("clamperl"), undefined, "Clamperl must never also have a level evolution entry");
});

test("Feebas evolves into Milotic at a flat level 30, never a Beauty condition", () => {
  assert.deepEqual(getLevelEvolution("feebas"), { evolvesToSpeciesId: "milotic", requiredLevel: 30 });
});

test("Azurill evolves into Marill at level 16, the same simplified-Friendship-to-level rule as pichu/cleffa/igglybuff/togepi", () => {
  assert.deepEqual(getLevelEvolution("azurill"), { evolvesToSpeciesId: "marill", requiredLevel: 16 });
});

test("Wynaut (Hoenn) evolves into Wobbuffet (Johto) at level 15", () => {
  assert.deepEqual(getLevelEvolution("wynaut"), { evolvesToSpeciesId: "wobbuffet", requiredLevel: 15 });
});

test("Skitty evolves into Delcatty via Moon Stone (Hoenn Completeness Review), and never also via level", () => {
  assert.equal(getEvolutionItemEvolutionByItem("skitty", "moon-stone")?.evolvesToSpeciesId, "delcatty");
  assert.equal(getLevelEvolution("skitty"), undefined, "Skitty must never also have a level evolution entry");
  assert.equal(getBranchEvolution("skitty"), undefined);
});

test("Hoenn Completeness Review: the four pre-existing Kanto Moon Stone evolutions, previously missing entirely, now exist", () => {
  assert.equal(getEvolutionItemEvolutionByItem("nidorina", "moon-stone")?.evolvesToSpeciesId, "nidoqueen");
  assert.equal(getEvolutionItemEvolutionByItem("nidorino", "moon-stone")?.evolvesToSpeciesId, "nidoking");
  assert.equal(getEvolutionItemEvolutionByItem("clefairy", "moon-stone")?.evolvesToSpeciesId, "clefable");
  assert.equal(getEvolutionItemEvolutionByItem("jigglypuff", "moon-stone")?.evolvesToSpeciesId, "wigglytuff");

  // None of the five Moon Stone species are ever also a level evolution —
  // same mutual-exclusivity rule every other evolution-item species follows.
  for (const speciesId of ["nidorina", "nidorino", "clefairy", "jigglypuff", "skitty"]) {
    assert.equal(getLevelEvolution(speciesId), undefined, `${speciesId} must never also have a level evolution entry`);
  }
});

// Hoenn Evolution Cleanup — Nincada is a normal level-20 Branch choice
// between Ninjask and Shedinja (no bonus/duplicate Pokémon, no free-slot or
// Poké Ball requirement — the same single-target-replacement shape every
// other branch and evolution method already uses).
test("Nincada is an explicit level-20 Branch choice between Ninjask and Shedinja, never automatic or a bonus Pokémon", () => {
  const branch = getBranchEvolution("nincada");
  assert.equal(branch?.requiredLevel, 20);
  assert.deepEqual(branch?.targets, ["ninjask", "shedinja"]);
  assert.equal(getLevelEvolution("nincada"), undefined, "Nincada must never also have a level evolution entry");
  assert.deepEqual(getEvolutionItemEvolutions("nincada"), [], "Nincada must never also have an evolution-item evolution");

  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "nincada", level: 19, attackStat: 0, defenseStat: 0 }), null);
  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "nincada", level: 20, attackStat: 0, defenseStat: 0 }), {
    kind: "branch",
    targets: ["ninjask", "shedinja"],
  });
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "nincada", level: 20, attackStat: 0, defenseStat: 0 }, "ninjask"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "nincada", level: 20, attackStat: 0, defenseStat: 0 }, "shedinja"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "nincada", level: 20, attackStat: 0, defenseStat: 0 }, "ninjatwo"), false);
});

test("Ninjask and Shedinja themselves have no further evolution, and neither is ever a level-evolution key", () => {
  for (const id of ["ninjask", "shedinja"]) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
});

test("Castform has no evolution of any kind", () => {
  assert.equal(getLevelEvolution("castform"), undefined);
  assert.deepEqual(getEvolutionItemEvolutions("castform"), []);
  assert.equal(getBranchEvolution("castform"), undefined);
});

test("Deoxys and all four of its forms have no evolution of any kind", () => {
  for (const id of ["deoxys", "deoxys-attack", "deoxys-defense", "deoxys-speed"]) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
});

test("every Hoenn legendary/mythical species (Regis, Latias/Latios, Kyogre/Groudon/Rayquaza, Jirachi) has no evolution", () => {
  const legendaryIds = ["regirock", "regice", "registeel", "latias", "latios", "kyogre", "groudon", "rayquaza", "jirachi"];
  for (const id of legendaryIds) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
});

test("Bagon and Beldum pseudo-legendary lines are complete three-stage level chains", () => {
  assert.deepEqual(getLevelEvolution("bagon"), { evolvesToSpeciesId: "shelgon", requiredLevel: 30 });
  assert.deepEqual(getLevelEvolution("shelgon"), { evolvesToSpeciesId: "salamence", requiredLevel: 50 });
  assert.equal(getLevelEvolution("salamence"), undefined);

  assert.deepEqual(getLevelEvolution("beldum"), { evolvesToSpeciesId: "metang", requiredLevel: 20 });
  assert.deepEqual(getLevelEvolution("metang"), { evolvesToSpeciesId: "metagross", requiredLevel: 45 });
  assert.equal(getLevelEvolution("metagross"), undefined);
});

test("deriveSpeciesWildLevelRange correctly derives Hoenn level-chain ranges from the new evolution data alone", () => {
  assert.deepEqual(deriveSpeciesWildLevelRange("treecko"), { minimumLevel: 1, maximumLevel: 15 });
  assert.deepEqual(deriveSpeciesWildLevelRange("grovyle"), { minimumLevel: 16, maximumLevel: 35 });
  assert.deepEqual(deriveSpeciesWildLevelRange("sceptile"), { minimumLevel: 36, maximumLevel: Number.POSITIVE_INFINITY });
});

test("deriveSpeciesWildLevelRange leaves a Branch-only species (Wurmple, Nincada) fully unrestricted, same as Eevee already was", () => {
  assert.deepEqual(deriveSpeciesWildLevelRange("wurmple"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
  assert.deepEqual(deriveSpeciesWildLevelRange("eevee"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
  // Nincada moved from a level evolution (capped at maximumLevel 19) to a
  // Branch — deriveSpeciesWildLevelRange only ever reads LEVEL_EVOLUTIONS
  // (see that function's own doc comment), so a Branch-only species is
  // invisible to it by design, exactly like Eevee/Wurmple already are. This
  // is the expected, consistent consequence of the method change, not a
  // regression.
  assert.deepEqual(deriveSpeciesWildLevelRange("nincada"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
  // Ninjask/Shedinja are Branch TARGETS, not a LEVEL_EVOLUTIONS
  // evolvesToSpeciesId — same "invisible to the reverse index, unrestricted
  // from below" treatment Espeon/Umbreon/Silcoon/Cascoon already have.
  assert.deepEqual(deriveSpeciesWildLevelRange("ninjask"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
  assert.deepEqual(deriveSpeciesWildLevelRange("shedinja"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
});

test("deriveSpeciesWildLevelRange leaves an evolution-item target (Ludicolo, Huntail) fully unrestricted, same as Vileplume already was", () => {
  assert.deepEqual(deriveSpeciesWildLevelRange("ludicolo"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
  assert.deepEqual(deriveSpeciesWildLevelRange("huntail"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
  assert.deepEqual(deriveSpeciesWildLevelRange("vileplume"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
});

// ============================================================================
// Generation IV (Sinnoh, Phase 2)
// ============================================================================

test("every Sinnoh starter line is complete: level 18 then level 32/36 for all three lines", () => {
  assert.deepEqual(getLevelEvolution("turtwig"), { evolvesToSpeciesId: "grotle", requiredLevel: 18 });
  assert.deepEqual(getLevelEvolution("grotle"), { evolvesToSpeciesId: "torterra", requiredLevel: 32 });
  assert.equal(getLevelEvolution("torterra"), undefined);

  assert.deepEqual(getLevelEvolution("chimchar"), { evolvesToSpeciesId: "monferno", requiredLevel: 14 });
  assert.deepEqual(getLevelEvolution("monferno"), { evolvesToSpeciesId: "infernape", requiredLevel: 36 });
  assert.equal(getLevelEvolution("infernape"), undefined);

  assert.deepEqual(getLevelEvolution("piplup"), { evolvesToSpeciesId: "prinplup", requiredLevel: 16 });
  assert.deepEqual(getLevelEvolution("prinplup"), { evolvesToSpeciesId: "empoleon", requiredLevel: 36 });
  assert.equal(getLevelEvolution("empoleon"), undefined);
});

test("every former-Friendship (and Friendship+Time/Move-Known) Sinnoh evolution is now a plain level-16 evolution, the same default every prior Friendship simplification uses", () => {
  const friendshipSimplified: [string, string][] = [
    ["budew", "roselia"],
    ["buneary", "lopunny"],
    ["bonsly", "sudowoodo"],
    ["mime-jr", "mr-mime"],
    ["munchlax", "snorlax"],
    ["riolu", "lucario"],
    ["chingling", "chimecho"],
    ["mantyke", "mantine"],
  ];

  for (const [speciesId, target] of friendshipSimplified) {
    assert.deepEqual(getLevelEvolution(speciesId), { evolvesToSpeciesId: target, requiredLevel: 16 }, `${speciesId} -> ${target}`);
  }
});

test("Burmy is an explicit level-20 Branch choice between Wormadam and Mothim, never a hidden Gender value", () => {
  const branch = getBranchEvolution("burmy");
  assert.equal(branch?.requiredLevel, 20);
  assert.deepEqual(branch?.targets, ["wormadam", "mothim"]);
  assert.equal(getLevelEvolution("burmy"), undefined, "Burmy must never also have a level evolution entry");

  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "burmy", level: 19, attackStat: 0, defenseStat: 0 }), null);
  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "burmy", level: 20, attackStat: 0, defenseStat: 0 }), {
    kind: "branch",
    targets: ["wormadam", "mothim"],
  });
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "burmy", level: 20, attackStat: 0, defenseStat: 0 }, "wormadam"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "burmy", level: 20, attackStat: 0, defenseStat: 0 }, "mothim"), true);
});

test("Combee evolves into Vespiquen at level 21, a plain level evolution since only one target exists (real-game Gender restriction dropped)", () => {
  assert.deepEqual(getLevelEvolution("combee"), { evolvesToSpeciesId: "vespiquen", requiredLevel: 21 });
});

// Sinnoh Phase 2 design correction — Leafeon/Glaceon were originally
// implemented as two more Eevee Branch targets; this reverses that and
// makes them direct evolution-item evolutions instead (Leaf Stone/Ice
// Stone), matching this table's own existing "former Location/Trade
// evolution, now direct item use" precedent (e.g. Magneton -> Magnezone,
// Sneasel -> Weavile). Eevee's Branch itself returns to exactly its
// original two targets.
test("Eevee's Branch is exactly Espeon/Umbreon; Leafeon/Glaceon are evolution-item evolutions, not Branch targets", () => {
  const branch = getBranchEvolution("eevee")!;
  assert.equal(branch.requiredLevel, 16);
  assert.deepEqual(branch.targets, ["espeon", "umbreon"]);
});

test("Eevee has exactly five evolution-item branches (fire/water/thunder/leaf/ice stones); Leafeon is reachable only via Leaf Stone, Glaceon only via Ice Stone", () => {
  const branches = getEvolutionItemEvolutions("eevee");
  const byItem = Object.fromEntries(branches.map((branch) => [branch.itemId, branch.evolvesToSpeciesId]));

  assert.equal(branches.length, 5);
  assert.equal(byItem["fire-stone"], "flareon");
  assert.equal(byItem["water-stone"], "vaporeon");
  assert.equal(byItem["thunder-stone"], "jolteon");
  assert.equal(byItem["leaf-stone"], "leafeon");
  assert.equal(byItem["ice-stone"], "glaceon");

  assert.equal(getEvolutionItemEvolutionByItem("eevee", "water-stone")?.evolvesToSpeciesId, "vaporeon", "Leaf Stone's addition must not disturb Eevee's pre-existing branches");
  assert.equal(
    branches.filter((branch) => branch.evolvesToSpeciesId === "leafeon").length,
    1,
    "Leafeon must be reachable through exactly one evolution-item branch (Leaf Stone)"
  );
  assert.equal(
    branches.filter((branch) => branch.evolvesToSpeciesId === "glaceon").length,
    1,
    "Glaceon must be reachable through exactly one evolution-item branch (Ice Stone)"
  );
});

test("Eevee is never a key in LEVEL_EVOLUTIONS — no duplicate/competing Eevee evolution definitions exist outside Branch + evolution-item", () => {
  assert.equal(getLevelEvolution("eevee"), undefined);
});

test("isEvolutionItemId recognizes ice-stone", () => {
  assert.equal(isEvolutionItemId("ice-stone"), true);
});

test("former Move-Known Sinnoh evolutions keep their real canonical level, dropping only the move requirement", () => {
  assert.deepEqual(getLevelEvolution("aipom"), { evolvesToSpeciesId: "ambipom", requiredLevel: 32 });
  assert.deepEqual(getLevelEvolution("tangela"), { evolvesToSpeciesId: "tangrowth", requiredLevel: 36 });
  assert.deepEqual(getLevelEvolution("lickitung"), { evolvesToSpeciesId: "lickilicky", requiredLevel: 33 });
  assert.deepEqual(getLevelEvolution("yanma"), { evolvesToSpeciesId: "yanmega", requiredLevel: 33 });
  assert.deepEqual(getLevelEvolution("piloswine"), { evolvesToSpeciesId: "mamoswine", requiredLevel: 45 });
});

test("former Location (special magnetic field) Sinnoh evolutions are now plain level evolutions", () => {
  assert.deepEqual(getLevelEvolution("magneton"), { evolvesToSpeciesId: "magnezone", requiredLevel: 40 });
  assert.deepEqual(getLevelEvolution("nosepass"), { evolvesToSpeciesId: "probopass", requiredLevel: 42 });
});

test("isEvolutionItemId recognizes all eleven new Sinnoh evolution items", () => {
  for (const itemId of ["dawn-stone", "dusk-stone", "shiny-stone", "protector", "dubious-disc", "reaper-cloth", "razor-claw", "razor-fang", "electirizer", "magmarizer", "oval-stone"]) {
    assert.equal(isEvolutionItemId(itemId), true, `${itemId} must be a recognized EvolutionItemId`);
  }
});

test("former Trade-with-held-item Sinnoh evolutions now evolve directly from their item, no trade involved", () => {
  assert.equal(getEvolutionItemEvolutionByItem("sneasel", "razor-claw")?.evolvesToSpeciesId, "weavile");
  assert.equal(getEvolutionItemEvolutionByItem("rhydon", "protector")?.evolvesToSpeciesId, "rhyperior");
  assert.equal(getEvolutionItemEvolutionByItem("electabuzz", "electirizer")?.evolvesToSpeciesId, "electivire");
  assert.equal(getEvolutionItemEvolutionByItem("magmar", "magmarizer")?.evolvesToSpeciesId, "magmortar");
  assert.equal(getEvolutionItemEvolutionByItem("gligar", "razor-fang")?.evolvesToSpeciesId, "gliscor");
  assert.equal(getEvolutionItemEvolutionByItem("porygon2", "dubious-disc")?.evolvesToSpeciesId, "porygon-z");
  assert.equal(getEvolutionItemEvolutionByItem("dusclops", "reaper-cloth")?.evolvesToSpeciesId, "dusknoir");
});

test("Roselia -> Roserade (Shiny Stone) and Happiny -> Chansey (Oval Stone) are direct evolution-item evolutions", () => {
  assert.equal(getEvolutionItemEvolutionByItem("roselia", "shiny-stone")?.evolvesToSpeciesId, "roserade");
  assert.equal(getEvolutionItemEvolutionByItem("togetic", "shiny-stone")?.evolvesToSpeciesId, "togekiss");
  assert.equal(getEvolutionItemEvolutionByItem("happiny", "oval-stone")?.evolvesToSpeciesId, "chansey");
});

test("Misdreavus -> Mismagius and Murkrow -> Honchkrow each evolve via Dusk Stone, two independent single-branch species", () => {
  assert.equal(getEvolutionItemEvolutionByItem("misdreavus", "dusk-stone")?.evolvesToSpeciesId, "mismagius");
  assert.equal(getEvolutionItemEvolutionByItem("murkrow", "dusk-stone")?.evolvesToSpeciesId, "honchkrow");
});

test("Kirlia keeps its level-30 evolution into Gardevoir AND gains an independent Dawn Stone branch into Gallade (real-game Gender restriction dropped)", () => {
  assert.deepEqual(getLevelEvolution("kirlia"), { evolvesToSpeciesId: "gardevoir", requiredLevel: 30 });
  assert.equal(getEvolutionItemEvolutionByItem("kirlia", "dawn-stone")?.evolvesToSpeciesId, "gallade");
});

test("Snorunt keeps its level-42 evolution into Glalie AND gains an independent Dawn Stone branch into Froslass (real-game Gender restriction dropped)", () => {
  assert.deepEqual(getLevelEvolution("snorunt"), { evolvesToSpeciesId: "glalie", requiredLevel: 42 });
  assert.equal(getEvolutionItemEvolutionByItem("snorunt", "dawn-stone")?.evolvesToSpeciesId, "froslass");
});

test("every Sinnoh legendary/mythical species (lake trio, Dialga/Palkia, Heatran, Regigigas, Cresselia, Phione/Manaphy, Darkrai, Shaymin, Arceus) has no evolution", () => {
  const legendaryIds = [
    "uxie", "mesprit", "azelf", "dialga", "palkia", "heatran", "regigigas",
    "cresselia", "phione", "manaphy", "darkrai", "shaymin", "arceus",
  ];
  for (const id of legendaryIds) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
});

test("Giratina (both forms) and Rotom (all six forms) have no evolution of any kind", () => {
  for (const id of ["giratina", "giratina-origin", "rotom", "rotom-heat", "rotom-wash", "rotom-frost", "rotom-fan", "rotom-mow"]) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
});

test("Gible pseudo-legendary line is a complete three-stage level chain", () => {
  assert.deepEqual(getLevelEvolution("gible"), { evolvesToSpeciesId: "gabite", requiredLevel: 24 });
  assert.deepEqual(getLevelEvolution("gabite"), { evolvesToSpeciesId: "garchomp", requiredLevel: 48 });
  assert.equal(getLevelEvolution("garchomp"), undefined);
});

test("deriveSpeciesWildLevelRange correctly derives Sinnoh level-chain ranges from the new evolution data alone", () => {
  assert.deepEqual(deriveSpeciesWildLevelRange("turtwig"), { minimumLevel: 1, maximumLevel: 17 });
  assert.deepEqual(deriveSpeciesWildLevelRange("grotle"), { minimumLevel: 18, maximumLevel: 31 });
  assert.deepEqual(deriveSpeciesWildLevelRange("torterra"), { minimumLevel: 32, maximumLevel: Number.POSITIVE_INFINITY });
});

test("deriveSpeciesWildLevelRange correctly chains a cross-generation Sinnoh link (Magnemite -> Magneton -> Magnezone) with no collision", () => {
  assert.deepEqual(deriveSpeciesWildLevelRange("magnemite"), { minimumLevel: 1, maximumLevel: 29 });
  assert.deepEqual(deriveSpeciesWildLevelRange("magneton"), { minimumLevel: 30, maximumLevel: 39 });
  assert.deepEqual(deriveSpeciesWildLevelRange("magnezone"), { minimumLevel: 40, maximumLevel: Number.POSITIVE_INFINITY });
});

test("deriveSpeciesWildLevelRange leaves a Sinnoh Branch-only species (Burmy) and its evolution-item targets (Roserade, Weavile) fully unrestricted", () => {
  assert.deepEqual(deriveSpeciesWildLevelRange("burmy"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
  assert.deepEqual(deriveSpeciesWildLevelRange("wormadam"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
  assert.deepEqual(deriveSpeciesWildLevelRange("mothim"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
  assert.deepEqual(deriveSpeciesWildLevelRange("roserade"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
  assert.deepEqual(deriveSpeciesWildLevelRange("weavile"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
});
