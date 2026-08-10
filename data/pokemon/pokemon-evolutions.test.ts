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
  getEvolutionItemEvolutionsByItem,
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

test("isEvolutionItemId recognizes exactly the sixteen canonical evolution-item ids (Evolution Item Cleanup phase's final catalog)", () => {
  const canonicalIds = [
    "fire-stone", "water-stone", "thunder-stone", "leaf-stone", "sun-stone",
    "moon-stone", "ice-stone", "dawn-stone", "dusk-stone", "shiny-stone",
    "kings-rock", "metal-coat", "dragon-scale", "upgrade", "protector", "reaper-cloth",
  ];
  for (const itemId of canonicalIds) {
    assert.equal(isEvolutionItemId(itemId), true, `${itemId} must be a recognized EvolutionItemId`);
  }
  assert.equal(canonicalIds.length, 16, "exactly 16 evolution products: 10 stones + 6 items");
  assert.equal(isEvolutionItemId("poke-ball"), false);

  // Retired items (Evolution Item Cleanup phase) must never be recognized
  // again — each species that used to need one of these now shares a
  // kept/general item instead (see this file's own remapping tests below).
  const retiredIds = [
    "deep-sea-tooth", "deep-sea-scale", "dubious-disc", "razor-claw",
    "razor-fang", "electirizer", "magmarizer", "oval-stone",
  ];
  for (const itemId of retiredIds) {
    assert.equal(isEvolutionItemId(itemId), false, `${itemId} must no longer be a recognized EvolutionItemId`);
  }
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

test("Clamperl evolves via a Water Stone BRANCH (Huntail or Gorebyss), never a trade and never a hidden value", () => {
  const branches = getEvolutionItemEvolutions("clamperl");
  assert.equal(branches.length, 2);
  assert.ok(branches.every((branch) => branch.itemId === "water-stone"), "both branches share the same item");

  const targets = branches.map((branch) => branch.evolvesToSpeciesId).sort();
  assert.deepEqual(targets, ["gorebyss", "huntail"]);

  // getEvolutionItemEvolutionByItem's plain .find() only ever surfaces the
  // first entry (Huntail) — real branch consumers must use the plural
  // getEvolutionItemEvolutionsByItem instead, which returns both.
  assert.equal(getEvolutionItemEvolutionByItem("clamperl", "water-stone")?.evolvesToSpeciesId, "huntail");
  const waterStoneBranches = getEvolutionItemEvolutionsByItem("clamperl", "water-stone");
  assert.equal(waterStoneBranches.length, 2);
  assert.deepEqual(waterStoneBranches.map((b) => b.evolvesToSpeciesId).sort(), ["gorebyss", "huntail"]);

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

test("Eevee has exactly six evolution-item branches (fire/water/thunder/leaf/ice/shiny stones); Leafeon is reachable only via Leaf Stone, Glaceon only via Ice Stone, Sylveon only via Shiny Stone", () => {
  const branches = getEvolutionItemEvolutions("eevee");
  const byItem = Object.fromEntries(branches.map((branch) => [branch.itemId, branch.evolvesToSpeciesId]));

  assert.equal(branches.length, 6);
  assert.equal(byItem["fire-stone"], "flareon");
  assert.equal(byItem["water-stone"], "vaporeon");
  assert.equal(byItem["thunder-stone"], "jolteon");
  assert.equal(byItem["leaf-stone"], "leafeon");
  assert.equal(byItem["ice-stone"], "glaceon");
  assert.equal(byItem["shiny-stone"], "sylveon");

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
  assert.equal(
    branches.filter((branch) => branch.evolvesToSpeciesId === "sylveon").length,
    1,
    "Sylveon must be reachable through exactly one evolution-item branch (Shiny Stone), not the Espeon/Umbreon level Branch"
  );
});

test("Sylveon is never added to Eevee's Espeon/Umbreon level-16 Branch (Kalos Phase 2) — the Branch's targets stay exactly two", () => {
  const branch = getBranchEvolution("eevee")!;
  assert.deepEqual(branch.targets, ["espeon", "umbreon"]);
  assert.ok(!branch.targets.includes("sylveon"), "Sylveon must be an evolution-item target, never a Branch target");
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

test("isEvolutionItemId recognizes the six new Sinnoh evolution items kept after Evolution Item Cleanup", () => {
  for (const itemId of ["dawn-stone", "dusk-stone", "shiny-stone", "protector", "reaper-cloth"]) {
    assert.equal(isEvolutionItemId(itemId), true, `${itemId} must be a recognized EvolutionItemId`);
  }
});

// Evolution Item Cleanup phase — every former Trade-with-held-item Sinnoh
// evolution that used to need its OWN unique item (Razor Claw, Electirizer,
// Magmarizer, Razor Fang, Dubious Disc, Oval Stone) is remapped onto one of
// the 16 kept/general items instead. Rhydon/Dusclops (Protector/Reaper
// Cloth) were never remapped — those two items were kept as-is.
test("former Trade-with-held-item Sinnoh evolutions now evolve directly from a kept/remapped item, no trade involved", () => {
  assert.equal(getEvolutionItemEvolutionByItem("sneasel", "ice-stone")?.evolvesToSpeciesId, "weavile");
  assert.equal(getEvolutionItemEvolutionByItem("rhydon", "protector")?.evolvesToSpeciesId, "rhyperior");
  assert.equal(getEvolutionItemEvolutionByItem("electabuzz", "thunder-stone")?.evolvesToSpeciesId, "electivire");
  assert.equal(getEvolutionItemEvolutionByItem("magmar", "fire-stone")?.evolvesToSpeciesId, "magmortar");
  assert.equal(getEvolutionItemEvolutionByItem("gligar", "dusk-stone")?.evolvesToSpeciesId, "gliscor");
  assert.equal(getEvolutionItemEvolutionByItem("porygon2", "upgrade")?.evolvesToSpeciesId, "porygon-z");
  assert.equal(getEvolutionItemEvolutionByItem("dusclops", "reaper-cloth")?.evolvesToSpeciesId, "dusknoir");

  // The eight retired item ids must never resolve any evolution anymore.
  assert.equal(getEvolutionItemEvolutionByItem("sneasel", "razor-claw"), undefined);
  assert.equal(getEvolutionItemEvolutionByItem("electabuzz", "electirizer"), undefined);
  assert.equal(getEvolutionItemEvolutionByItem("magmar", "magmarizer"), undefined);
  assert.equal(getEvolutionItemEvolutionByItem("gligar", "razor-fang"), undefined);
  assert.equal(getEvolutionItemEvolutionByItem("porygon2", "dubious-disc"), undefined);
});

test("Roselia -> Roserade (Shiny Stone) and Happiny -> Chansey (remapped to Moon Stone) are direct evolution-item evolutions", () => {
  assert.equal(getEvolutionItemEvolutionByItem("roselia", "shiny-stone")?.evolvesToSpeciesId, "roserade");
  assert.equal(getEvolutionItemEvolutionByItem("togetic", "shiny-stone")?.evolvesToSpeciesId, "togekiss");
  assert.equal(getEvolutionItemEvolutionByItem("happiny", "moon-stone")?.evolvesToSpeciesId, "chansey");
  assert.equal(getEvolutionItemEvolutionByItem("happiny", "oval-stone"), undefined, "Oval Stone is retired");
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

// ============================================================================
// Generation V (Unova, Phase 2)
// ============================================================================

test("every Unova starter line is complete: level 17 then level 36 for all three lines", () => {
  const lines: [string, string, string][] = [
    ["snivy", "servine", "serperior"],
    ["tepig", "pignite", "emboar"],
    ["oshawott", "dewott", "samurott"],
  ];

  for (const [base, middle, final] of lines) {
    assert.deepEqual(getLevelEvolution(base), { evolvesToSpeciesId: middle, requiredLevel: 17 }, `${base} -> ${middle}`);
    assert.deepEqual(getLevelEvolution(middle), { evolvesToSpeciesId: final, requiredLevel: 36 }, `${middle} -> ${final}`);
    assert.equal(getLevelEvolution(final), undefined, `${final} is a final evolution and must have no further level evolution`);
  }
});

test("every plain Unova level evolution resolves to its real canonical target and level", () => {
  const plainLevelEvolutions: [string, string, number][] = [
    ["patrat", "watchog", 20],
    ["lillipup", "herdier", 16],
    ["herdier", "stoutland", 32],
    ["purrloin", "liepard", 20],
    ["pidove", "tranquill", 21],
    ["tranquill", "unfezant", 32],
    ["blitzle", "zebstrika", 27],
    ["roggenrola", "boldore", 25],
    ["drilbur", "excadrill", 31],
    ["timburr", "gurdurr", 25],
    ["tympole", "palpitoad", 25],
    ["palpitoad", "seismitoad", 36],
    ["sewaddle", "swadloon", 20],
    ["venipede", "whirlipede", 22],
    ["whirlipede", "scolipede", 30],
    ["sandile", "krokorok", 29],
    ["krokorok", "krookodile", 40],
    ["darumaka", "darmanitan", 35],
    ["dwebble", "crustle", 34],
    ["scraggy", "scrafty", 39],
    ["yamask", "cofagrigus", 34],
    ["tirtouga", "carracosta", 37],
    ["archen", "archeops", 37],
    ["trubbish", "garbodor", 36],
    ["zorua", "zoroark", 30],
    ["gothita", "gothorita", 32],
    ["gothorita", "gothitelle", 41],
    ["solosis", "duosion", 32],
    ["duosion", "reuniclus", 41],
    ["ducklett", "swanna", 35],
    ["vanillite", "vanillish", 35],
    ["vanillish", "vanilluxe", 47],
    ["deerling", "sawsbuck", 34],
    ["foongus", "amoonguss", 39],
    ["frillish", "jellicent", 40],
    ["joltik", "galvantula", 36],
    ["ferroseed", "ferrothorn", 40],
    ["klink", "klang", 38],
    ["klang", "klinklang", 49],
    ["tynamo", "eelektrik", 39],
    ["elgyem", "beheeyem", 42],
    ["litwick", "lampent", 41],
    ["axew", "fraxure", 38],
    ["fraxure", "haxorus", 48],
    ["cubchoo", "beartic", 37],
    ["mienfoo", "mienshao", 50],
    ["golett", "golurk", 43],
    ["pawniard", "bisharp", 52],
    ["rufflet", "braviary", 54],
    ["vullaby", "mandibuzz", 54],
    ["larvesta", "volcarona", 59],
  ];

  for (const [speciesId, targetId, level] of plainLevelEvolutions) {
    assert.deepEqual(
      getLevelEvolution(speciesId),
      { evolvesToSpeciesId: targetId, requiredLevel: level },
      `${speciesId} -> ${targetId} @ ${level}`
    );
  }
});

test("Deino/Zweilous/Hydreigon is Unova's pseudo-legendary line: a complete three-stage level chain", () => {
  assert.deepEqual(getLevelEvolution("deino"), { evolvesToSpeciesId: "zweilous", requiredLevel: 50 });
  assert.deepEqual(getLevelEvolution("zweilous"), { evolvesToSpeciesId: "hydreigon", requiredLevel: 64 });
  assert.equal(getLevelEvolution("hydreigon"), undefined);
});

test("former Friendship Unova evolutions (Woobat, Swadloon) are now plain level evolutions — Woobat defaults to level 16 (no collision), Swadloon uses level 30 (above its own level-20 floor)", () => {
  assert.deepEqual(getLevelEvolution("woobat"), { evolvesToSpeciesId: "swoobat", requiredLevel: 16 });
  assert.deepEqual(getLevelEvolution("swadloon"), { evolvesToSpeciesId: "leavanny", requiredLevel: 30 });
});

test("former Trade Unova evolutions (Gurdurr, Boldore, Karrablast, Shelmet) are now plain level evolutions at exactly the levels this phase assigns, never a branch or an evolution item", () => {
  const formerTradeEvolutions: [string, string, number][] = [
    ["gurdurr", "conkeldurr", 40],
    ["boldore", "gigalith", 40],
    ["karrablast", "escavalier", 35],
    ["shelmet", "accelgor", 35],
  ];

  for (const [speciesId, targetId, level] of formerTradeEvolutions) {
    assert.deepEqual(getLevelEvolution(speciesId), { evolvesToSpeciesId: targetId, requiredLevel: level }, `${speciesId} -> ${targetId} @ ${level}`);
    assert.deepEqual(getEvolutionItemEvolutions(speciesId), [], `${speciesId} must not also have an evolution-item evolution`);
    assert.equal(getBranchEvolution(speciesId), undefined, `${speciesId} must not be a branch evolution`);
  }
});

test("every Unova evolution-item evolution resolves to its real canonical target and item, using only existing catalog items", () => {
  const itemEvolutions: [string, string, string][] = [
    ["pansage", "simisage", "leaf-stone"],
    ["pansear", "simisear", "fire-stone"],
    ["panpour", "simipour", "water-stone"],
    ["munna", "musharna", "moon-stone"],
    ["cottonee", "whimsicott", "sun-stone"],
    ["petilil", "lilligant", "sun-stone"],
    ["eelektrik", "eelektross", "thunder-stone"],
    ["minccino", "cinccino", "shiny-stone"],
    ["lampent", "chandelure", "dusk-stone"],
  ];

  for (const [speciesId, targetId, itemId] of itemEvolutions) {
    assert.equal(getEvolutionItemEvolutionByItem(speciesId, itemId)?.evolvesToSpeciesId, targetId, `${speciesId} -> ${targetId} via ${itemId}`);
    assert.equal(getLevelEvolution(speciesId), undefined, `${speciesId} must never also have a level evolution entry`);
  }
});

test("Eelektrik and Lampent each keep their own pre-existing level evolution (from Tynamo/Litwick) alongside their independent evolution-item evolution", () => {
  assert.deepEqual(getLevelEvolution("tynamo"), { evolvesToSpeciesId: "eelektrik", requiredLevel: 39 });
  assert.equal(getEvolutionItemEvolutionByItem("eelektrik", "thunder-stone")?.evolvesToSpeciesId, "eelektross");

  assert.deepEqual(getLevelEvolution("litwick"), { evolvesToSpeciesId: "lampent", requiredLevel: 41 });
  assert.equal(getEvolutionItemEvolutionByItem("lampent", "dusk-stone")?.evolvesToSpeciesId, "chandelure");
});

test("the evolution-item catalog is unchanged by Unova: still exactly the same 16 EvolutionItemId values, no new evolution product introduced", () => {
  const canonicalIds = [
    "fire-stone", "water-stone", "thunder-stone", "leaf-stone", "sun-stone",
    "moon-stone", "ice-stone", "dawn-stone", "dusk-stone", "shiny-stone",
    "kings-rock", "metal-coat", "dragon-scale", "upgrade", "protector", "reaper-cloth",
  ];
  assert.equal(canonicalIds.length, 16);
  for (const itemId of canonicalIds) {
    assert.equal(isEvolutionItemId(itemId), true, `${itemId} must still be a recognized EvolutionItemId`);
  }
  // No new item id (e.g. a Unova-only stone) was ever introduced.
  for (const fakeUnovaItem of ["trade-stone", "unova-stone", "reveal-glass", "prison-bottle"]) {
    assert.equal(isEvolutionItemId(fakeUnovaItem), false, `${fakeUnovaItem} must never be a recognized EvolutionItemId`);
  }
});

test("no Unova species uses branch evolution — every real trade/gender/personality-value mechanic was replaced with level or item, never a player-choice branch", () => {
  const unovaSpeciesTouchedByEvolution = [
    "snivy", "servine", "tepig", "pignite", "oshawott", "dewott", "patrat", "lillipup", "herdier",
    "purrloin", "pansage", "pansear", "panpour", "munna", "pidove", "tranquill", "blitzle", "roggenrola",
    "boldore", "woobat", "drilbur", "timburr", "gurdurr", "tympole", "palpitoad", "sewaddle", "swadloon",
    "venipede", "whirlipede", "cottonee", "petilil", "sandile", "krokorok", "darumaka", "dwebble", "scraggy",
    "yamask", "tirtouga", "archen", "trubbish", "zorua", "minccino", "gothita", "gothorita", "solosis",
    "duosion", "ducklett", "vanillite", "vanillish", "deerling", "karrablast", "foongus", "frillish", "joltik",
    "ferroseed", "klink", "klang", "tynamo", "eelektrik", "elgyem", "litwick", "lampent", "axew", "fraxure",
    "cubchoo", "shelmet", "mienfoo", "golett", "pawniard", "rufflet", "vullaby", "deino", "zweilous", "larvesta",
  ];
  for (const speciesId of unovaSpeciesTouchedByEvolution) {
    assert.equal(getBranchEvolution(speciesId), undefined, `${speciesId} must never be a branch evolution — Unova Phase 2 uses only level and evolution-item`);
  }
});

test("every genuinely standalone (non-evolving, non-legendary) Unova species has no evolution of any kind", () => {
  const standaloneIds = [
    "audino", "throh", "sawk", "basculin", "maractus", "sigilyph",
    "emolga", "alomomola", "cryogonal", "stunfisk", "druddigon", "bouffalant", "heatmor", "durant",
  ];
  for (const id of standaloneIds) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
});

test("every Unova legendary/mythical species (Victini, Swords of Justice, Forces of Nature incl. Therian forms, Reshiram/Zekrom, Kyurem incl. Black/White, Keldeo, Meloetta incl. Pirouette, Genesect) has no evolution of any kind", () => {
  const legendaryIds = [
    "victini", "cobalion", "terrakion", "virizion",
    "tornadus", "tornadus-therian", "thundurus", "thundurus-therian",
    "reshiram", "zekrom",
    "landorus", "landorus-therian",
    "kyurem", "kyurem-black", "kyurem-white",
    "keldeo", "meloetta", "meloetta-pirouette", "genesect",
  ];
  for (const id of legendaryIds) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
});

test("alternate forms never get their own evolution, on either side of the arrow — a form is never a source, and no evolution ever targets a form", () => {
  const formIds = ["tornadus-therian", "thundurus-therian", "landorus-therian", "kyurem-black", "kyurem-white", "meloetta-pirouette"];

  for (const formId of formIds) {
    assert.equal(getLevelEvolution(formId), undefined, `${formId} must never be a level-evolution source`);
    assert.deepEqual(getEvolutionItemEvolutions(formId), [], `${formId} must never be an evolution-item source`);
    assert.equal(getBranchEvolution(formId), undefined, `${formId} must never be a branch-evolution source`);
  }

  for (const { evolution } of getAllLevelEvolutionEntries()) {
    assert.ok(!formIds.includes(evolution.evolvesToSpeciesId), `${evolution.evolvesToSpeciesId} is an alternate form and must never be a level-evolution target`);
  }
  for (const { evolution } of getAllEvolutionItemEvolutionEntries()) {
    assert.ok(!formIds.includes(evolution.evolvesToSpeciesId), `${evolution.evolvesToSpeciesId} is an alternate form and must never be an evolution-item target`);
  }
});

test("total evolution counts include exactly 65 new Unova level evolutions and 9 new Unova evolution-item evolutions", () => {
  // formOf === undefined excludes alternate forms sharing a dex number in
  // this range — this used to only matter for Unova's own Therian/Black/
  // White/Pirouette forms (none of which ever had an evolution entry, see
  // the "alternate forms never get their own evolution" test above), but
  // Galar Phase 2 added evolution entries for two Galarian Forms whose
  // BASE species happens to share a Unova dex number (yamask-galar, dex
  // #562; darumaka-galar, dex #554) — a plain dexNumber-range filter alone
  // can no longer distinguish "genuinely Unova" from "a Galarian reskin of
  // a Unova species", so formOf === undefined is required to keep this
  // count scoped to real Unova base species only.
  const unovaDexRange = new Set(
    POKEMON_DATA.filter((species) => species.formOf === undefined && species.dexNumber >= 494 && species.dexNumber <= 649).map(
      (species) => species.id
    )
  );

  const unovaLevelEntries = getAllLevelEvolutionEntries().filter((entry) => unovaDexRange.has(entry.speciesId));
  const unovaItemEntries = getAllEvolutionItemEvolutionEntries().filter((entry) => unovaDexRange.has(entry.speciesId));

  assert.equal(unovaLevelEntries.length, 65);
  assert.equal(unovaItemEntries.length, 9);
});

test("deriveSpeciesWildLevelRange correctly derives the four former-Trade Unova chains with no gaps, no overlaps, and no empty ranges: Conkeldurr, Gigalith, Escavalier, Accelgor", () => {
  assert.deepEqual(deriveSpeciesWildLevelRange("timburr"), { minimumLevel: 1, maximumLevel: 24 });
  assert.deepEqual(deriveSpeciesWildLevelRange("gurdurr"), { minimumLevel: 25, maximumLevel: 39 });
  assert.deepEqual(deriveSpeciesWildLevelRange("conkeldurr"), { minimumLevel: 40, maximumLevel: Number.POSITIVE_INFINITY });

  assert.deepEqual(deriveSpeciesWildLevelRange("roggenrola"), { minimumLevel: 1, maximumLevel: 24 });
  assert.deepEqual(deriveSpeciesWildLevelRange("boldore"), { minimumLevel: 25, maximumLevel: 39 });
  assert.deepEqual(deriveSpeciesWildLevelRange("gigalith"), { minimumLevel: 40, maximumLevel: Number.POSITIVE_INFINITY });

  assert.deepEqual(deriveSpeciesWildLevelRange("karrablast"), { minimumLevel: 1, maximumLevel: 34 });
  assert.deepEqual(deriveSpeciesWildLevelRange("escavalier"), { minimumLevel: 35, maximumLevel: Number.POSITIVE_INFINITY });

  assert.deepEqual(deriveSpeciesWildLevelRange("shelmet"), { minimumLevel: 1, maximumLevel: 34 });
  assert.deepEqual(deriveSpeciesWildLevelRange("accelgor"), { minimumLevel: 35, maximumLevel: Number.POSITIVE_INFINITY });
});

test("deriveSpeciesWildLevelRange correctly derives the two former-Friendship Unova chains with no collision: Woobat/Swoobat and Sewaddle/Swadloon/Leavanny", () => {
  assert.deepEqual(deriveSpeciesWildLevelRange("woobat"), { minimumLevel: 1, maximumLevel: 15 });
  assert.deepEqual(deriveSpeciesWildLevelRange("swoobat"), { minimumLevel: 16, maximumLevel: Number.POSITIVE_INFINITY });

  assert.deepEqual(deriveSpeciesWildLevelRange("sewaddle"), { minimumLevel: 1, maximumLevel: 19 });
  assert.deepEqual(deriveSpeciesWildLevelRange("swadloon"), { minimumLevel: 20, maximumLevel: 29 });
  assert.deepEqual(deriveSpeciesWildLevelRange("leavanny"), { minimumLevel: 30, maximumLevel: Number.POSITIVE_INFINITY });
});

test("deriveSpeciesWildLevelRange leaves every Unova evolution-item target (Musharna, Simisear, Eelektross, Chandelure) fully unrestricted, same as Ludicolo/Vileplume already are", () => {
  for (const id of ["musharna", "simisage", "simisear", "simipour", "whimsicott", "lilligant", "eelektross", "cinccino", "chandelure"]) {
    assert.deepEqual(deriveSpeciesWildLevelRange(id), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY }, `${id} must be fully unrestricted (evolution-item targets are invisible to the level-only reverse index)`);
  }
});

test("deriveSpeciesWildLevelRange correctly derives the Unova pseudo-legendary chain (Deino/Zweilous/Hydreigon) with no collision", () => {
  assert.deepEqual(deriveSpeciesWildLevelRange("deino"), { minimumLevel: 1, maximumLevel: 49 });
  assert.deepEqual(deriveSpeciesWildLevelRange("zweilous"), { minimumLevel: 50, maximumLevel: 63 });
  assert.deepEqual(deriveSpeciesWildLevelRange("hydreigon"), { minimumLevel: 64, maximumLevel: Number.POSITIVE_INFINITY });
});

// ============================================================================
// Generation VI (Kalos, Phase 2)
// ============================================================================

test("every Kalos starter line is complete: level 16 then level 36 for all three lines", () => {
  const lines: [string, string, string][] = [
    ["chespin", "quilladin", "chesnaught"],
    ["fennekin", "braixen", "delphox"],
    ["froakie", "frogadier", "greninja"],
  ];

  for (const [base, middle, final] of lines) {
    assert.deepEqual(getLevelEvolution(base), { evolvesToSpeciesId: middle, requiredLevel: 16 }, `${base} -> ${middle}`);
    assert.deepEqual(getLevelEvolution(middle), { evolvesToSpeciesId: final, requiredLevel: 36 }, `${middle} -> ${final}`);
    assert.equal(getLevelEvolution(final), undefined, `${final} is a final evolution and must have no further level evolution`);
  }
});

test("every plain Kalos level evolution resolves to its real canonical target and level", () => {
  const plainLevelEvolutions: [string, string, number][] = [
    ["bunnelby", "diggersby", 20],
    ["fletchling", "fletchinder", 17],
    ["fletchinder", "talonflame", 35],
    ["scatterbug", "spewpa", 9],
    ["spewpa", "vivillon", 12],
    ["litleo", "pyroar", 35],
    ["flabebe", "floette", 19],
    ["skiddo", "gogoat", 32],
    ["espurr", "meowstic", 25],
    ["honedge", "doublade", 35],
    ["binacle", "barbaracle", 39],
    ["skrelp", "dragalge", 48],
    ["clauncher", "clawitzer", 37],
    ["bergmite", "avalugg", 37],
    ["noibat", "noivern", 48],
  ];

  for (const [speciesId, targetId, level] of plainLevelEvolutions) {
    assert.deepEqual(
      getLevelEvolution(speciesId),
      { evolvesToSpeciesId: targetId, requiredLevel: level },
      `${speciesId} -> ${targetId} @ ${level}`
    );
  }
});

test("Goomy/Sliggoo/Goodra is Kalos's own pseudo-legendary line: a complete three-stage level chain", () => {
  assert.deepEqual(getLevelEvolution("goomy"), { evolvesToSpeciesId: "sliggoo", requiredLevel: 40 });
  assert.deepEqual(getLevelEvolution("sliggoo"), { evolvesToSpeciesId: "goodra", requiredLevel: 50 });
  assert.equal(getLevelEvolution("goodra"), undefined);
});

test("approved Kalos mechanic simplifications: Pancham, Inkay, Sliggoo, Phantump, and Pumpkaboo keep their real canonical level and drop only the unsupported condition", () => {
  // Pancham -> Pangoro: former party-composition (another Dark-type
  // required) evolution.
  assert.deepEqual(getLevelEvolution("pancham"), { evolvesToSpeciesId: "pangoro", requiredLevel: 32 });
  // Inkay -> Malamar: former device-orientation (upside-down) evolution.
  assert.deepEqual(getLevelEvolution("inkay"), { evolvesToSpeciesId: "malamar", requiredLevel: 30 });
  // Sliggoo -> Goodra: former weather (rain) evolution.
  assert.deepEqual(getLevelEvolution("sliggoo"), { evolvesToSpeciesId: "goodra", requiredLevel: 50 });
  // Phantump -> Trevenant: former Trade evolution.
  assert.deepEqual(getLevelEvolution("phantump"), { evolvesToSpeciesId: "trevenant", requiredLevel: 35 });
  // Pumpkaboo -> Gourgeist: former Trade evolution.
  assert.deepEqual(getLevelEvolution("pumpkaboo"), { evolvesToSpeciesId: "gourgeist", requiredLevel: 35 });

  // None of the five ever became an evolution-item or branch evolution.
  for (const speciesId of ["pancham", "inkay", "sliggoo", "phantump", "pumpkaboo"]) {
    assert.deepEqual(getEvolutionItemEvolutions(speciesId), [], `${speciesId} must not also have an evolution-item evolution`);
    assert.equal(getBranchEvolution(speciesId), undefined, `${speciesId} must not be a branch evolution`);
  }
});

test("every Kalos evolution-item evolution resolves to its real canonical target and item, using only existing catalog items", () => {
  const itemEvolutions: [string, string, string][] = [
    ["floette", "florges", "shiny-stone"],
    ["doublade", "aegislash", "dusk-stone"],
    ["spritzee", "aromatisse", "shiny-stone"],
    ["swirlix", "slurpuff", "shiny-stone"],
    // Helioptile -> Heliolisk uses Thunder Stone in this project (design
    // correction from the real-game Sun Stone method).
    ["helioptile", "heliolisk", "thunder-stone"],
  ];

  for (const [speciesId, targetId, itemId] of itemEvolutions) {
    assert.equal(getEvolutionItemEvolutionByItem(speciesId, itemId)?.evolvesToSpeciesId, targetId, `${speciesId} -> ${targetId} via ${itemId}`);
    assert.equal(getLevelEvolution(speciesId), undefined, `${speciesId} must never also have a level evolution entry`);
  }
});

test("Helioptile -> Heliolisk uses Thunder Stone, not Sun Stone (Kalos evolution correction)", () => {
  assert.equal(getEvolutionItemEvolutionByItem("helioptile", "thunder-stone")?.evolvesToSpeciesId, "heliolisk");
  assert.equal(getEvolutionItemEvolutionByItem("helioptile", "sun-stone"), undefined, "Helioptile must no longer have a Sun Stone evolution");

  const branches = getEvolutionItemEvolutions("helioptile");
  assert.equal(branches.length, 1, "Helioptile must have exactly one evolution-item branch");
  assert.equal(branches[0]?.itemId, "thunder-stone");
});

test("Eevee -> Sylveon via Shiny Stone (Kalos Phase 2)", () => {
  assert.equal(getEvolutionItemEvolutionByItem("eevee", "shiny-stone")?.evolvesToSpeciesId, "sylveon");
});

test("Floette and Doublade each keep their own pre-existing level evolution (from Flabébé/Honedge) alongside their independent evolution-item evolution", () => {
  assert.deepEqual(getLevelEvolution("flabebe"), { evolvesToSpeciesId: "floette", requiredLevel: 19 });
  assert.equal(getEvolutionItemEvolutionByItem("floette", "shiny-stone")?.evolvesToSpeciesId, "florges");

  assert.deepEqual(getLevelEvolution("honedge"), { evolvesToSpeciesId: "doublade", requiredLevel: 35 });
  assert.equal(getEvolutionItemEvolutionByItem("doublade", "dusk-stone")?.evolvesToSpeciesId, "aegislash");
});

test("the evolution-item catalog is unchanged by Kalos: still exactly the same 16 EvolutionItemId values, no new evolution product introduced", () => {
  const canonicalIds = [
    "fire-stone", "water-stone", "thunder-stone", "leaf-stone", "sun-stone",
    "moon-stone", "ice-stone", "dawn-stone", "dusk-stone", "shiny-stone",
    "kings-rock", "metal-coat", "dragon-scale", "upgrade", "protector", "reaper-cloth",
  ];
  assert.equal(canonicalIds.length, 16);
  for (const itemId of canonicalIds) {
    assert.equal(isEvolutionItemId(itemId), true, `${itemId} must still be a recognized EvolutionItemId`);
  }
  // No new item id (e.g. a Kalos-only stone) was ever introduced, and no
  // retired item was ever reintroduced.
  for (const fakeOrRetiredItem of [
    "mega-stone", "prison-bottle", "sachet", "whipped-dream",
    "deep-sea-tooth", "deep-sea-scale", "dubious-disc", "razor-claw", "razor-fang", "electirizer", "magmarizer", "oval-stone",
  ]) {
    assert.equal(isEvolutionItemId(fakeOrRetiredItem), false, `${fakeOrRetiredItem} must never be a recognized EvolutionItemId`);
  }
});

test("no Kalos species uses branch evolution — every real trade/party/orientation/weather/affection mechanic was replaced with level or item, never a player-choice branch", () => {
  const kalosSpeciesTouchedByEvolution = [
    "chespin", "quilladin", "fennekin", "braixen", "froakie", "frogadier",
    "bunnelby", "fletchling", "fletchinder", "scatterbug", "spewpa", "litleo",
    "flabebe", "floette", "skiddo", "pancham", "espurr", "honedge", "doublade",
    "spritzee", "swirlix", "inkay", "binacle", "skrelp", "clauncher", "helioptile",
    "tyrunt", "amaura", "goomy", "sliggoo", "phantump", "pumpkaboo", "bergmite", "noibat",
  ];
  for (const speciesId of kalosSpeciesTouchedByEvolution) {
    assert.equal(getBranchEvolution(speciesId), undefined, `${speciesId} must never be a branch evolution — Kalos Phase 2 uses only level and evolution-item`);
  }
});

test("every genuinely standalone (non-evolving, non-legendary) Kalos species has no evolution of any kind", () => {
  const standaloneIds = ["furfrou", "hawlucha", "dedenne", "carbink", "klefki"];
  for (const id of standaloneIds) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
});

test("every Kalos legendary/mythical species (Xerneas, Yveltal, Zygarde, Diancie, Hoopa incl. Unbound Form, Volcanion) has no evolution of any kind", () => {
  const legendaryIds = ["xerneas", "yveltal", "zygarde", "diancie", "hoopa", "hoopa-unbound", "volcanion"];
  for (const id of legendaryIds) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
});

test("Hoopa Unbound is a Form, not an evolution — no hoopa -> hoopa-unbound entry exists in any evolution table", () => {
  assert.equal(getLevelEvolution("hoopa"), undefined);
  assert.deepEqual(getEvolutionItemEvolutions("hoopa"), []);
  assert.equal(getBranchEvolution("hoopa"), undefined);

  for (const { evolution } of getAllLevelEvolutionEntries()) {
    assert.notEqual(evolution.evolvesToSpeciesId, "hoopa-unbound", "hoopa-unbound must never be a level-evolution target");
  }
  for (const { evolution } of getAllEvolutionItemEvolutionEntries()) {
    assert.notEqual(evolution.evolvesToSpeciesId, "hoopa-unbound", "hoopa-unbound must never be an evolution-item target");
  }
});

test("no Mega Evolution appears anywhere in the evolution registry", () => {
  const megaLikeLevelTargets = getAllLevelEvolutionEntries().filter((entry) => entry.evolution.evolvesToSpeciesId.startsWith("mega-"));
  const megaLikeItemTargets = getAllEvolutionItemEvolutionEntries().filter((entry) => entry.evolution.evolvesToSpeciesId.startsWith("mega-"));
  assert.deepEqual(megaLikeLevelTargets, []);
  assert.deepEqual(megaLikeItemTargets, []);

  for (const fakeMegaItem of ["mega-stone", "mega-stone-x", "mega-stone-y", "key-stone"]) {
    assert.equal(isEvolutionItemId(fakeMegaItem), false, `${fakeMegaItem} must never be a recognized EvolutionItemId`);
  }
});

test("total evolution counts include exactly 29 new Kalos level evolutions and 5 new Kalos-native evolution-item evolutions", () => {
  const kalosDexRange = new Set(POKEMON_DATA.filter((species) => species.dexNumber >= 650 && species.dexNumber <= 721).map((species) => species.id));

  const kalosLevelEntries = getAllLevelEvolutionEntries().filter((entry) => kalosDexRange.has(entry.speciesId));
  const kalosItemEntries = getAllEvolutionItemEvolutionEntries().filter((entry) => kalosDexRange.has(entry.speciesId));

  assert.equal(kalosLevelEntries.length, 29);
  assert.equal(kalosItemEntries.length, 5, "Kalos-native evolution-item species only — Eevee -> Sylveon is a Kanto-keyed entry and is verified separately");
});

test("no duplicate evolution definitions and no conflicting level/item/branch outcome for any Kalos evolution target", () => {
  const kalosLevelTargets = new Map<string, string[]>();
  for (const { speciesId, evolution } of getAllLevelEvolutionEntries()) {
    const list = kalosLevelTargets.get(evolution.evolvesToSpeciesId) ?? [];
    list.push(speciesId);
    kalosLevelTargets.set(evolution.evolvesToSpeciesId, list);
  }

  // Every Kalos evolution TARGET (the evolved species) must be reachable
  // from exactly one pre-evolution — no two different species both claim
  // to evolve into the same Kalos target.
  const kalosTargets = [
    "quilladin", "chesnaught", "braixen", "delphox", "frogadier", "greninja",
    "diggersby", "fletchinder", "talonflame", "spewpa", "vivillon", "pyroar",
    "floette", "gogoat", "pangoro", "meowstic", "doublade", "malamar",
    "barbaracle", "dragalge", "clawitzer", "tyrantrum", "aurorus", "sliggoo",
    "goodra", "trevenant", "gourgeist", "avalugg", "noivern",
  ];
  for (const target of kalosTargets) {
    const sources = kalosLevelTargets.get(target) ?? [];
    assert.equal(sources.length, 1, `${target} must be reachable from exactly one level-evolution source, found: ${sources.join(", ")}`);
  }
});

test("deriveSpeciesWildLevelRange correctly derives the three Kalos starter chains", () => {
  const lines: [string, string, string][] = [
    ["chespin", "quilladin", "chesnaught"],
    ["fennekin", "braixen", "delphox"],
    ["froakie", "frogadier", "greninja"],
  ];
  for (const [base, middle, final] of lines) {
    assert.deepEqual(deriveSpeciesWildLevelRange(base), { minimumLevel: 1, maximumLevel: 15 });
    assert.deepEqual(deriveSpeciesWildLevelRange(middle), { minimumLevel: 16, maximumLevel: 35 });
    assert.deepEqual(deriveSpeciesWildLevelRange(final), { minimumLevel: 36, maximumLevel: Number.POSITIVE_INFINITY });
  }
});

test("deriveSpeciesWildLevelRange correctly derives the Kalos pseudo-legendary chain (Goomy/Sliggoo/Goodra) with no collision", () => {
  assert.deepEqual(deriveSpeciesWildLevelRange("goomy"), { minimumLevel: 1, maximumLevel: 39 });
  assert.deepEqual(deriveSpeciesWildLevelRange("sliggoo"), { minimumLevel: 40, maximumLevel: 49 });
  assert.deepEqual(deriveSpeciesWildLevelRange("goodra"), { minimumLevel: 50, maximumLevel: Number.POSITIVE_INFINITY });
});

test("deriveSpeciesWildLevelRange correctly derives the five approved-simplification Kalos chains with no gaps, no overlaps, and no empty ranges: Pancham, Inkay, Phantump, Pumpkaboo", () => {
  assert.deepEqual(deriveSpeciesWildLevelRange("pancham"), { minimumLevel: 1, maximumLevel: 31 });
  assert.deepEqual(deriveSpeciesWildLevelRange("pangoro"), { minimumLevel: 32, maximumLevel: Number.POSITIVE_INFINITY });

  assert.deepEqual(deriveSpeciesWildLevelRange("inkay"), { minimumLevel: 1, maximumLevel: 29 });
  assert.deepEqual(deriveSpeciesWildLevelRange("malamar"), { minimumLevel: 30, maximumLevel: Number.POSITIVE_INFINITY });

  assert.deepEqual(deriveSpeciesWildLevelRange("phantump"), { minimumLevel: 1, maximumLevel: 34 });
  assert.deepEqual(deriveSpeciesWildLevelRange("trevenant"), { minimumLevel: 35, maximumLevel: Number.POSITIVE_INFINITY });

  assert.deepEqual(deriveSpeciesWildLevelRange("pumpkaboo"), { minimumLevel: 1, maximumLevel: 34 });
  assert.deepEqual(deriveSpeciesWildLevelRange("gourgeist"), { minimumLevel: 35, maximumLevel: Number.POSITIVE_INFINITY });
});

test("deriveSpeciesWildLevelRange leaves every Kalos evolution-item target (Florges, Aegislash, Aromatisse, Slurpuff, Heliolisk, Sylveon) fully unrestricted, same as Ludicolo/Vileplume already are", () => {
  for (const id of ["florges", "aegislash", "aromatisse", "slurpuff", "heliolisk", "sylveon"]) {
    assert.deepEqual(deriveSpeciesWildLevelRange(id), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY }, `${id} must be fully unrestricted (evolution-item targets are invisible to the level-only reverse index)`);
  }
});

// ============================================================================
// Generation VII (Alola, Phase 2)
// ============================================================================

test("every Alola starter line is complete: level 17 then level 34 for all three lines", () => {
  const lines: [string, string, string][] = [
    ["rowlet", "dartrix", "decidueye"],
    ["litten", "torracat", "incineroar"],
    ["popplio", "brionne", "primarina"],
  ];

  for (const [base, middle, final] of lines) {
    assert.deepEqual(getLevelEvolution(base), { evolvesToSpeciesId: middle, requiredLevel: 17 }, `${base} -> ${middle}`);
    assert.deepEqual(getLevelEvolution(middle), { evolvesToSpeciesId: final, requiredLevel: 34 }, `${middle} -> ${final}`);
    assert.equal(getLevelEvolution(final), undefined, `${final} is a final evolution and must have no further level evolution`);
  }
});

test("every plain Alola level evolution resolves to its real canonical target and level", () => {
  const plainLevelEvolutions: [string, string, number][] = [
    ["pikipek", "trumbeak", 14],
    ["trumbeak", "toucannon", 28],
    ["yungoos", "gumshoos", 20],
    ["grubbin", "charjabug", 20],
    ["cutiefly", "ribombee", 25],
    ["mareanie", "toxapex", 38],
    ["mudbray", "mudsdale", 30],
    ["dewpider", "araquanid", 22],
    ["fomantis", "lurantis", 34],
    ["morelull", "shiinotic", 24],
    ["stufful", "bewear", 27],
    ["bounsweet", "steenee", 18],
    ["wimpod", "golisopod", 30],
    ["sandygast", "palossand", 34],
    ["jangmo-o", "hakamo-o", 35],
    ["hakamo-o", "kommo-o", 45],
    ["cosmog", "cosmoem", 43],
  ];

  for (const [speciesId, targetId, level] of plainLevelEvolutions) {
    assert.deepEqual(
      getLevelEvolution(speciesId),
      { evolvesToSpeciesId: targetId, requiredLevel: level },
      `${speciesId} -> ${targetId} @ ${level}`
    );
  }
  assert.equal(getLevelEvolution("kommo-o"), undefined, "Kommo-o is Alola's pseudo-legendary line's final stage and must have no further evolution");
});

test("Jangmo-o/Hakamo-o/Kommo-o is Alola's own pseudo-legendary line: a complete three-stage level chain", () => {
  assert.deepEqual(getLevelEvolution("jangmo-o"), { evolvesToSpeciesId: "hakamo-o", requiredLevel: 35 });
  assert.deepEqual(getLevelEvolution("hakamo-o"), { evolvesToSpeciesId: "kommo-o", requiredLevel: 45 });
  assert.equal(getLevelEvolution("kommo-o"), undefined);
});

test("approved Alola mechanic simplifications: Crabrawler/Salandit/Steenee/Type: Null/Poipole/Meltan keep this phase's own assigned level and drop only the unsupported condition", () => {
  // Crabrawler -> Crabominable: former Location (Mount Lanakila) evolution.
  assert.deepEqual(getLevelEvolution("crabrawler"), { evolvesToSpeciesId: "crabominable", requiredLevel: 35 });
  // Salandit -> Salazzle: former Gender-restricted (female only) evolution.
  assert.deepEqual(getLevelEvolution("salandit"), { evolvesToSpeciesId: "salazzle", requiredLevel: 33 });
  // Steenee -> Tsareena: former Move-Known (Stomp) evolution.
  assert.deepEqual(getLevelEvolution("steenee"), { evolvesToSpeciesId: "tsareena", requiredLevel: 29 });
  // Type: Null -> Silvally: former Friendship evolution.
  assert.deepEqual(getLevelEvolution("type-null"), { evolvesToSpeciesId: "silvally", requiredLevel: 40 });
  // Poipole -> Naganadel: former Move-Known (Dragon Pulse) evolution.
  assert.deepEqual(getLevelEvolution("poipole"), { evolvesToSpeciesId: "naganadel", requiredLevel: 40 });
  // Meltan -> Melmetal: former Pokémon GO Candy evolution — no candy/currency/item requirement of any kind.
  assert.deepEqual(getLevelEvolution("meltan"), { evolvesToSpeciesId: "melmetal", requiredLevel: 40 });

  // None of the six ever became an evolution-item or branch evolution.
  for (const speciesId of ["crabrawler", "salandit", "steenee", "type-null", "poipole", "meltan"]) {
    assert.deepEqual(getEvolutionItemEvolutions(speciesId), [], `${speciesId} must not also have an evolution-item evolution`);
    assert.equal(getBranchEvolution(speciesId), undefined, `${speciesId} must not be a branch evolution`);
  }
});

test("Rockruff is an explicit level-25 Branch choice between all three Lycanroc forms, never day/night/Own-Tempo/randomness", () => {
  const branch = getBranchEvolution("rockruff");
  assert.equal(branch?.requiredLevel, 25);
  assert.deepEqual(branch?.targets, ["lycanroc", "lycanroc-midnight", "lycanroc-dusk"]);
  assert.equal(getLevelEvolution("rockruff"), undefined, "Rockruff must never also have a level evolution entry");
  assert.deepEqual(getEvolutionItemEvolutions("rockruff"), [], "Rockruff must never also have an evolution-item evolution");

  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "rockruff", level: 24, attackStat: 0, defenseStat: 0 }), null);
  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "rockruff", level: 25, attackStat: 0, defenseStat: 0 }), {
    kind: "branch",
    targets: ["lycanroc", "lycanroc-midnight", "lycanroc-dusk"],
  });
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "rockruff", level: 25, attackStat: 0, defenseStat: 0 }, "lycanroc"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "rockruff", level: 25, attackStat: 0, defenseStat: 0 }, "lycanroc-midnight"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "rockruff", level: 25, attackStat: 0, defenseStat: 0 }, "lycanroc-dusk"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "rockruff", level: 25, attackStat: 0, defenseStat: 0 }, "raichu"), false);
});

test("Cosmoem is an explicit level-53 Branch choice between Solgaleo and Lunala, never game-version/day-night/randomness; Cosmog -> Cosmoem itself stays a plain level-43 evolution", () => {
  assert.deepEqual(getLevelEvolution("cosmog"), { evolvesToSpeciesId: "cosmoem", requiredLevel: 43 });

  const branch = getBranchEvolution("cosmoem");
  assert.equal(branch?.requiredLevel, 53);
  assert.deepEqual(branch?.targets, ["solgaleo", "lunala"]);
  assert.equal(getLevelEvolution("cosmoem"), undefined, "Cosmoem must never also have a level evolution entry");

  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "cosmoem", level: 52, attackStat: 0, defenseStat: 0 }), null);
  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "cosmoem", level: 53, attackStat: 0, defenseStat: 0 }), {
    kind: "branch",
    targets: ["solgaleo", "lunala"],
  });
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "cosmoem", level: 53, attackStat: 0, defenseStat: 0 }, "solgaleo"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "cosmoem", level: 53, attackStat: 0, defenseStat: 0 }, "lunala"), true);

  assert.equal(getLevelEvolution("solgaleo"), undefined);
  assert.equal(getLevelEvolution("lunala"), undefined);
});

test("Cubone was migrated from a single-target level-28 evolution to an explicit level-28 Branch (Marowak or Alolan Marowak), preserving the same threshold, no night/region/randomness condition", () => {
  assert.equal(getLevelEvolution("cubone"), undefined, "Cubone must no longer be a LEVEL_EVOLUTIONS key — migrated to Branch");

  const branch = getBranchEvolution("cubone");
  assert.equal(branch?.requiredLevel, 28, "the original Cubone -> Marowak level-28 threshold must be preserved");
  assert.deepEqual(branch?.targets, ["marowak", "marowak-alola"]);

  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "cubone", level: 27, attackStat: 0, defenseStat: 0 }), null);
  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "cubone", level: 28, attackStat: 0, defenseStat: 0 }), {
    kind: "branch",
    targets: ["marowak", "marowak-alola"],
  });
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "cubone", level: 28, attackStat: 0, defenseStat: 0 }, "marowak"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "cubone", level: 28, attackStat: 0, defenseStat: 0 }, "marowak-alola"), true);
});

test("Charjabug -> Vikavolt evolves via Thunder Stone (former Location evolution), never a level evolution", () => {
  assert.equal(getEvolutionItemEvolutionByItem("charjabug", "thunder-stone")?.evolvesToSpeciesId, "vikavolt");
  assert.deepEqual(getLevelEvolution("grubbin"), { evolvesToSpeciesId: "charjabug", requiredLevel: 20 }, "Grubbin's own pre-existing level evolution into Charjabug is untouched");
});

test("Alolan Sandshrew -> Alolan Sandslash and Alolan Vulpix -> Alolan Ninetales each evolve via Ice Stone", () => {
  assert.equal(getEvolutionItemEvolutionByItem("sandshrew-alola", "ice-stone")?.evolvesToSpeciesId, "sandslash-alola");
  assert.equal(getEvolutionItemEvolutionByItem("vulpix-alola", "ice-stone")?.evolvesToSpeciesId, "ninetales-alola");
});

test("Alolan Forms use the exact live catalog ids and the correct level thresholds — no Alolan source ever evolves into the Kantonian target", () => {
  const alolanLevelEvolutions: [string, string, number][] = [
    ["rattata-alola", "raticate-alola", 20],
    ["diglett-alola", "dugtrio-alola", 26],
    ["meowth-alola", "persian-alola", 28],
    ["geodude-alola", "graveler-alola", 25],
    ["graveler-alola", "golem-alola", 36],
    ["grimer-alola", "muk-alola", 38],
  ];

  for (const [speciesId, targetId, level] of alolanLevelEvolutions) {
    assert.deepEqual(
      getLevelEvolution(speciesId),
      { evolvesToSpeciesId: targetId, requiredLevel: level },
      `${speciesId} -> ${targetId} @ ${level}`
    );
  }
});

test("Alolan Graveler -> Alolan Golem uses the exact same former-Trade simplification (level 36) as the Kantonian Graveler -> Golem line, not a different Trade replacement", () => {
  assert.equal(getLevelEvolution("graveler")?.requiredLevel, 36, "Kantonian Graveler -> Golem's own threshold");
  assert.equal(getLevelEvolution("graveler-alola")?.requiredLevel, 36, "Alolan Graveler -> Alolan Golem must use the same threshold");
});

test("Pikachu + Thunder Stone offers exactly Raichu and Alolan Raichu, both reachable, with no region-specific condition", () => {
  const branches = getEvolutionItemEvolutions("pikachu");
  const thunderStoneBranches = branches.filter((b) => b.itemId === "thunder-stone");
  assert.equal(thunderStoneBranches.length, 2);
  assert.deepEqual(thunderStoneBranches.map((b) => b.evolvesToSpeciesId).sort(), ["raichu", "raichu-alola"]);

  // getEvolutionItemEvolutionByItem's plain .find() only ever surfaces the
  // first entry (Raichu) — the Inventory eligibility flow must use the
  // plural getEvolutionItemEvolutionsByItem instead, same Clamperl-shaped
  // rule as Pikachu's own comment in the data file explains.
  assert.equal(getEvolutionItemEvolutionByItem("pikachu", "thunder-stone")?.evolvesToSpeciesId, "raichu");
  const viaPlural = getEvolutionItemEvolutionsByItem("pikachu", "thunder-stone");
  assert.equal(viaPlural.length, 2);
  assert.deepEqual(viaPlural.map((b) => b.evolvesToSpeciesId).sort(), ["raichu", "raichu-alola"]);
});

test("Exeggcute + Leaf Stone offers exactly Exeggutor and Alolan Exeggutor, both reachable, with no region-specific condition", () => {
  const branches = getEvolutionItemEvolutionsByItem("exeggcute", "leaf-stone");
  assert.equal(branches.length, 2);
  assert.deepEqual(branches.map((b) => b.evolvesToSpeciesId).sort(), ["exeggutor", "exeggutor-alola"]);
});

test("normal Raichu/Exeggutor/Marowak remain reachable exactly as before, alongside their new Alolan alternatives", () => {
  assert.equal(getEvolutionItemEvolutionByItem("pikachu", "thunder-stone")?.evolvesToSpeciesId, "raichu");
  assert.ok(
    getEvolutionItemEvolutionsByItem("pikachu", "thunder-stone").some((b) => b.evolvesToSpeciesId === "raichu-alola"),
    "Alolan Raichu must also be reachable"
  );

  assert.ok(
    getEvolutionItemEvolutionsByItem("exeggcute", "leaf-stone").some((b) => b.evolvesToSpeciesId === "exeggutor"),
    "ordinary Exeggutor must remain reachable"
  );
  assert.ok(
    getEvolutionItemEvolutionsByItem("exeggcute", "leaf-stone").some((b) => b.evolvesToSpeciesId === "exeggutor-alola"),
    "Alolan Exeggutor must also be reachable"
  );

  const cuboneBranch = getBranchEvolution("cubone")!;
  assert.ok(cuboneBranch.targets.includes("marowak"), "ordinary Marowak must remain reachable");
  assert.ok(cuboneBranch.targets.includes("marowak-alola"), "Alolan Marowak must also be reachable");
});

test("no new evolution item was introduced for Alola: still exactly the same 16 EvolutionItemId values", () => {
  const canonicalIds = [
    "fire-stone", "water-stone", "thunder-stone", "leaf-stone", "sun-stone",
    "moon-stone", "ice-stone", "dawn-stone", "dusk-stone", "shiny-stone",
    "kings-rock", "metal-coat", "dragon-scale", "upgrade", "protector", "reaper-cloth",
  ];
  assert.equal(canonicalIds.length, 16);
  for (const itemId of canonicalIds) {
    assert.equal(isEvolutionItemId(itemId), true, `${itemId} must still be a recognized EvolutionItemId`);
  }
  for (const fakeAlolaItem of ["z-crystal", "meltan-box", "alola-stone", "ultra-ball", "beast-ball"]) {
    assert.equal(isEvolutionItemId(fakeAlolaItem), false, `${fakeAlolaItem} must never be a recognized EvolutionItemId`);
  }
});

test("no unapproved Gen VII form gets an evolution mapping: Oricorio, Wishiwashi, Minior, Silvally (its own memory-disc typing), Mimikyu, Necrozma, Magearna, and Totem forms have no form-specific evolution entries", () => {
  for (const id of ["oricorio", "wishiwashi", "minior", "mimikyu", "necrozma", "magearna"]) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
  // Silvally itself (Type: Null's evolved form) has no further evolution —
  // its 18 memory-disc types are a held-item battle mechanic, never a
  // species-level Form or evolution target.
  assert.equal(getLevelEvolution("silvally"), undefined);
});

test("every genuinely standalone (non-evolving, non-legendary) Alola species has no evolution of any kind", () => {
  const standaloneIds = [
    "oricorio", "wishiwashi", "comfey", "oranguru", "passimian", "pyukumuku",
    "minior", "komala", "turtonator", "togedemaru", "mimikyu", "bruxish", "drampa", "dhelmise",
  ];
  for (const id of standaloneIds) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
});

test("every Alola legendary/mythical/Ultra Beast species has no evolution of any kind (Tapu, standalone Ultra Beasts, Necrozma, Magearna, Marshadow, Zeraora)", () => {
  const legendaryIds = [
    "tapu-koko", "tapu-lele", "tapu-bulu", "tapu-fini",
    "nihilego", "buzzwole", "pheromosa", "xurkitree", "celesteela", "kartana", "guzzlord",
    "necrozma", "magearna", "marshadow", "stakataka", "blacephalon", "zeraora",
  ];
  for (const id of legendaryIds) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }

  // Final-stage/single-target legendary evolution outcomes have no further evolution either.
  for (const id of ["solgaleo", "lunala", "naganadel", "melmetal"]) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no further evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
});

test("no duplicate/conflicting Gen VII evolution outcome: every Gen VII level-evolution target is reachable from exactly one source", () => {
  const levelTargets = new Map<string, string[]>();
  for (const { speciesId, evolution } of getAllLevelEvolutionEntries()) {
    const list = levelTargets.get(evolution.evolvesToSpeciesId) ?? [];
    list.push(speciesId);
    levelTargets.set(evolution.evolvesToSpeciesId, list);
  }

  const gen7Targets = [
    "dartrix", "decidueye", "torracat", "incineroar", "brionne", "primarina",
    "trumbeak", "toucannon", "gumshoos", "charjabug", "crabominable", "ribombee",
    "toxapex", "mudsdale", "araquanid", "lurantis", "shiinotic", "salazzle",
    "bewear", "steenee", "tsareena", "golisopod", "palossand", "silvally",
    "hakamo-o", "kommo-o", "cosmoem", "naganadel", "melmetal",
    "raticate-alola", "dugtrio-alola", "persian-alola", "graveler-alola", "golem-alola", "muk-alola",
  ];
  for (const target of gen7Targets) {
    const sources = levelTargets.get(target) ?? [];
    assert.equal(sources.length, 1, `${target} must be reachable from exactly one level-evolution source, found: ${sources.join(", ")}`);
  }
});

// This phase (uniquely among prior generations) touches evolution
// definitions keyed by PRE-EXISTING Kanto species (Pikachu, Exeggcute,
// Cubone) in addition to new Gen VII species — so a pure dex-range filter
// (694-809, the pattern every prior generation's own "total evolution
// counts" test uses) would undercount. Counted explicitly instead: 29 new
// LEVEL_EVOLUTIONS entries keyed by a base Gen VII species (#722-809) + 6
// new LEVEL_EVOLUTIONS entries keyed by an Alolan Form (sharing a Kanto
// dexNumber) = 35 total new LEVEL_EVOLUTIONS entries, minus the 1
// migrated-out Cubone entry (now a Branch) = 34 net new LEVEL_EVOLUTIONS
// rows. Item evolutions: 3 brand-new species keys (charjabug,
// sandshrew-alola, vulpix-alola) + 2 new branches added to pre-existing
// species (pikachu, exeggcute) = 5 new EVOLUTION_ITEM_EVOLUTIONS rows.
// Branch evolutions: 2 brand-new (rockruff, cosmoem) + 1 migrated
// (cubone) = 3 new/changed BRANCH_EVOLUTIONS entries.
test("total evolution counts include exactly 34 net new Gen VII/Alolan-Form level evolutions, 5 new Gen VII evolution-item evolutions, and 3 new/changed Gen VII branch evolutions", () => {
  const gen7BaseLevelIds = [
    "rowlet", "dartrix", "litten", "torracat", "popplio", "brionne", "pikipek", "trumbeak", "yungoos",
    "grubbin", "crabrawler", "cutiefly", "mareanie", "mudbray", "dewpider", "fomantis", "morelull",
    "salandit", "stufful", "bounsweet", "steenee", "wimpod", "sandygast", "type-null", "jangmo-o",
    "hakamo-o", "cosmog", "poipole", "meltan",
  ];
  const alolanFormLevelIds = ["rattata-alola", "diglett-alola", "meowth-alola", "geodude-alola", "graveler-alola", "grimer-alola"];

  assert.equal(gen7BaseLevelIds.length, 29);
  assert.equal(alolanFormLevelIds.length, 6);
  for (const id of [...gen7BaseLevelIds, ...alolanFormLevelIds]) {
    assert.ok(getLevelEvolution(id), `${id} must have a level evolution entry`);
  }
  assert.equal(getLevelEvolution("cubone"), undefined, "the pre-existing cubone level entry was migrated out, for a net +34");

  assert.equal(getEvolutionItemEvolutions("charjabug").length, 1);
  assert.equal(getEvolutionItemEvolutions("sandshrew-alola").length, 1);
  assert.equal(getEvolutionItemEvolutions("vulpix-alola").length, 1);
  assert.equal(getEvolutionItemEvolutions("pikachu").length, 2, "pikachu gained one new thunder-stone branch (raichu-alola), for 2 total");
  assert.equal(getEvolutionItemEvolutions("exeggcute").length, 2, "exeggcute gained one new leaf-stone branch (exeggutor-alola), for 2 total");

  assert.ok(getBranchEvolution("rockruff"));
  assert.ok(getBranchEvolution("cosmoem"));
  assert.ok(getBranchEvolution("cubone"));
});

test("deriveSpeciesWildLevelRange correctly derives the Alola starter chains and the pseudo-legendary chain, with no collision", () => {
  const lines: [string, string, string][] = [
    ["rowlet", "dartrix", "decidueye"],
    ["litten", "torracat", "incineroar"],
    ["popplio", "brionne", "primarina"],
  ];
  for (const [base, middle, final] of lines) {
    assert.deepEqual(deriveSpeciesWildLevelRange(base), { minimumLevel: 1, maximumLevel: 16 });
    assert.deepEqual(deriveSpeciesWildLevelRange(middle), { minimumLevel: 17, maximumLevel: 33 });
    assert.deepEqual(deriveSpeciesWildLevelRange(final), { minimumLevel: 34, maximumLevel: Number.POSITIVE_INFINITY });
  }

  assert.deepEqual(deriveSpeciesWildLevelRange("jangmo-o"), { minimumLevel: 1, maximumLevel: 34 });
  assert.deepEqual(deriveSpeciesWildLevelRange("hakamo-o"), { minimumLevel: 35, maximumLevel: 44 });
  assert.deepEqual(deriveSpeciesWildLevelRange("kommo-o"), { minimumLevel: 45, maximumLevel: Number.POSITIVE_INFINITY });

  assert.deepEqual(deriveSpeciesWildLevelRange("cosmog"), { minimumLevel: 1, maximumLevel: 42 });
  assert.deepEqual(deriveSpeciesWildLevelRange("cosmoem"), { minimumLevel: 43, maximumLevel: Number.POSITIVE_INFINITY }, "Cosmoem's own maximumLevel is uncapped: its Branch evolution (unlike a LEVEL_EVOLUTIONS entry) is invisible to the level-only reverse index, same as every other Branch source");
});

test("deriveSpeciesWildLevelRange leaves Rockruff's three Lycanroc targets, Cosmoem's two targets, and Cubone's own range exactly as unrestricted/unchanged as every other Branch already establishes", () => {
  for (const id of ["lycanroc", "lycanroc-midnight", "lycanroc-dusk", "solgaleo", "lunala"]) {
    assert.deepEqual(deriveSpeciesWildLevelRange(id), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY }, `${id} is a Branch target — invisible to the level-only reverse index, same as Espeon/Umbreon already are`);
  }

  // Cubone's own range changes as an expected, consistent SIDE EFFECT of
  // the Branch migration: it used to be capped (maximumLevel 27, from its
  // old LEVEL_EVOLUTIONS entry) and is now uncapped, exactly like every
  // other Branch-only source (Eevee/Wurmple/Nincada/Burmy) already is —
  // never a regression.
  assert.deepEqual(deriveSpeciesWildLevelRange("cubone"), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
  for (const id of ["marowak", "marowak-alola"]) {
    assert.deepEqual(deriveSpeciesWildLevelRange(id), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY });
  }
});

test("deriveSpeciesWildLevelRange leaves every Gen VII evolution-item target (Vikavolt, Alolan Sandslash/Ninetales, Raichu, Alolan Raichu, Exeggutor, Alolan Exeggutor) fully unrestricted, same as Ludicolo/Vileplume already are", () => {
  for (const id of ["vikavolt", "sandslash-alola", "ninetales-alola", "raichu", "raichu-alola", "exeggutor", "exeggutor-alola"]) {
    assert.deepEqual(deriveSpeciesWildLevelRange(id), { minimumLevel: 1, maximumLevel: Number.POSITIVE_INFINITY }, `${id} must be fully unrestricted (evolution-item targets are invisible to the level-only reverse index)`);
  }
});

test("every Galar starter line is complete: level 16 then level 35 for all three lines", () => {
  const lines: [string, string, string][] = [
    ["grookey", "thwackey", "rillaboom"],
    ["scorbunny", "raboot", "cinderace"],
    ["sobble", "drizzile", "inteleon"],
  ];

  for (const [base, middle, final] of lines) {
    assert.deepEqual(getLevelEvolution(base), { evolvesToSpeciesId: middle, requiredLevel: 16 }, `${base} -> ${middle}`);
    assert.deepEqual(getLevelEvolution(middle), { evolvesToSpeciesId: final, requiredLevel: 35 }, `${middle} -> ${final}`);
    assert.equal(getLevelEvolution(final), undefined, `${final} is a final evolution and must have no further level evolution`);
  }
});

test("Dreepy/Drakloak/Dragapult is Galar's own pseudo-legendary line: a complete three-stage level chain", () => {
  assert.deepEqual(getLevelEvolution("dreepy"), { evolvesToSpeciesId: "drakloak", requiredLevel: 50 });
  assert.deepEqual(getLevelEvolution("drakloak"), { evolvesToSpeciesId: "dragapult", requiredLevel: 60 });
  assert.equal(getLevelEvolution("dragapult"), undefined);
});

test("every plain Galar level evolution resolves to its real canonical target and level", () => {
  const plainLevelEvolutions: [string, string, number][] = [
    ["skwovet", "greedent", 24],
    ["rookidee", "corvisquire", 18],
    ["corvisquire", "corviknight", 38],
    ["blipbug", "dottler", 10],
    ["dottler", "orbeetle", 30],
    ["nickit", "thievul", 18],
    ["gossifleur", "eldegoss", 20],
    ["wooloo", "dubwool", 24],
    ["chewtle", "drednaw", 22],
    ["yamper", "boltund", 25],
    ["rolycoly", "carkol", 18],
    ["carkol", "coalossal", 34],
    ["silicobra", "sandaconda", 36],
    ["arrokuda", "barraskewda", 26],
    ["toxel", "toxtricity", 30],
    ["sizzlipede", "centiskorch", 28],
    ["hatenna", "hattrem", 32],
    ["hattrem", "hatterene", 42],
    ["impidimp", "morgrem", 32],
    ["morgrem", "grimmsnarl", 42],
    ["cufant", "copperajah", 34],
  ];

  for (const [speciesId, targetId, level] of plainLevelEvolutions) {
    assert.deepEqual(
      getLevelEvolution(speciesId),
      { evolvesToSpeciesId: targetId, requiredLevel: level },
      `${speciesId} -> ${targetId} @ ${level}`
    );
  }
});

test("approved Galar mechanic simplifications: Clobbopus/Sinistea/Snom/Kubfu keep this phase's own assigned level and drop only the unsupported condition", () => {
  // Clobbopus -> Grapploct: former Move-Known (Taunt) evolution.
  assert.deepEqual(getLevelEvolution("clobbopus"), { evolvesToSpeciesId: "grapploct", requiredLevel: 35 });
  // Sinistea -> Polteageist: former Cracked Pot/Chipped Pot (Antique/Phony form) evolution.
  assert.deepEqual(getLevelEvolution("sinistea"), { evolvesToSpeciesId: "polteageist", requiredLevel: 32 });
  // Snom -> Frosmoth: former Friendship+Time(night) evolution.
  assert.deepEqual(getLevelEvolution("snom"), { evolvesToSpeciesId: "frosmoth", requiredLevel: 16 });
  // Kubfu -> Urshifu: former tower-progression/style-item evolution — this
  // project's single Urshifu representation is the only possible target.
  assert.deepEqual(getLevelEvolution("kubfu"), { evolvesToSpeciesId: "urshifu", requiredLevel: 40 });

  for (const speciesId of ["clobbopus", "sinistea", "snom", "kubfu"]) {
    assert.deepEqual(getEvolutionItemEvolutions(speciesId), [], `${speciesId} must not also have an evolution-item evolution`);
    assert.equal(getBranchEvolution(speciesId), undefined, `${speciesId} must not be a branch evolution`);
  }
});

test("Applin is an explicit level-25 Branch choice between Flapple and Appletun, never a hidden/unmapped item value", () => {
  const branch = getBranchEvolution("applin");
  assert.equal(branch?.requiredLevel, 25);
  assert.deepEqual(branch?.targets, ["flapple", "appletun"]);
  assert.equal(getLevelEvolution("applin"), undefined, "Applin must never also have a level evolution entry");
  assert.deepEqual(getEvolutionItemEvolutions("applin"), [], "Applin must never also have an evolution-item evolution");

  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "applin", level: 24, attackStat: 0, defenseStat: 0 }), null);
  assert.deepEqual(resolvePendingEvolutionEligibility({ speciesId: "applin", level: 25, attackStat: 0, defenseStat: 0 }), {
    kind: "branch",
    targets: ["flapple", "appletun"],
  });
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "applin", level: 25, attackStat: 0, defenseStat: 0 }, "flapple"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "applin", level: 25, attackStat: 0, defenseStat: 0 }, "appletun"), true);
  assert.equal(isPendingEvolutionTargetValid({ speciesId: "applin", level: 25, attackStat: 0, defenseStat: 0 }, "rillaboom"), false);
});

test("Milcery -> Alcremie evolves via Shiny Stone, the same Fairy-dessert-species precedent Spritzee/Swirlix already established", () => {
  assert.equal(getEvolutionItemEvolutionByItem("milcery", "shiny-stone")?.evolvesToSpeciesId, "alcremie");
  assert.equal(getLevelEvolution("milcery"), undefined, "Milcery must never also have a level evolution entry");
  assert.equal(getBranchEvolution("milcery"), undefined, "Milcery must never also have a branch evolution");
});

test("Galarian Meowth -> Perrserker and Galarian Ponyta -> Galarian Rapidash use their real canonical levels, identical to their Kantonian counterparts' own thresholds", () => {
  assert.deepEqual(getLevelEvolution("meowth-galar"), { evolvesToSpeciesId: "perrserker", requiredLevel: 28 });
  assert.equal(getLevelEvolution("meowth")?.requiredLevel, 28, "ordinary Meowth's own threshold is unchanged");
  assert.deepEqual(getLevelEvolution("ponyta-galar"), { evolvesToSpeciesId: "rapidash-galar", requiredLevel: 40 });
  assert.equal(getLevelEvolution("ponyta")?.requiredLevel, 40, "ordinary Ponyta's own threshold is unchanged");
});

test("Galarian Slowpoke branches exactly like ordinary Slowpoke: level -> Galarian Slowbro (37), King's Rock -> Galarian Slowking, mirroring the real species' own existing shape", () => {
  assert.deepEqual(getLevelEvolution("slowpoke-galar"), { evolvesToSpeciesId: "slowbro-galar", requiredLevel: 37 });
  assert.equal(getLevelEvolution("slowpoke")?.requiredLevel, 37, "ordinary Slowpoke's own level threshold into Slowbro is unchanged");
  assert.equal(getEvolutionItemEvolutionByItem("slowpoke-galar", "kings-rock")?.evolvesToSpeciesId, "slowking-galar");
  assert.equal(getEvolutionItemEvolutionByItem("slowpoke", "kings-rock")?.evolvesToSpeciesId, "slowking", "ordinary Slowpoke's own King's Rock branch into Slowking is unchanged");
});

test("Galarian Farfetch'd -> Sirfetch'd, Galarian Mr. Mime -> Mr. Rime, and Galarian Corsola -> Cursola use their assigned/real canonical levels", () => {
  // Galarian Farfetch'd -> Sirfetch'd: former three-critical-hits battle-achievement evolution.
  assert.deepEqual(getLevelEvolution("farfetchd-galar"), { evolvesToSpeciesId: "sirfetchd", requiredLevel: 30 });
  // Galarian Mr. Mime -> Mr. Rime: real canonical level 42.
  assert.deepEqual(getLevelEvolution("mr-mime-galar"), { evolvesToSpeciesId: "mr-rime", requiredLevel: 42 });
  // Galarian Corsola -> Cursola: real canonical level 38.
  assert.deepEqual(getLevelEvolution("corsola-galar"), { evolvesToSpeciesId: "cursola", requiredLevel: 38 });
});

test("Galarian Zigzagoon -> Galarian Linoone -> Obstagoon is a complete level chain (former night-time condition on the second step dropped, real canonical levels kept)", () => {
  assert.deepEqual(getLevelEvolution("zigzagoon-galar"), { evolvesToSpeciesId: "linoone-galar", requiredLevel: 20 });
  assert.equal(getLevelEvolution("zigzagoon")?.requiredLevel, 20, "ordinary Zigzagoon's own threshold into Linoone is unchanged");
  assert.deepEqual(getLevelEvolution("linoone-galar"), { evolvesToSpeciesId: "obstagoon", requiredLevel: 35 });
  assert.equal(getLevelEvolution("linoone"), undefined, "ordinary Linoone must never gain the Galar-only Obstagoon evolution");
  assert.equal(getLevelEvolution("obstagoon"), undefined, "Obstagoon is a final evolution");
});

test("Galarian Darumaka -> Galarian Darmanitan evolves via Ice Stone, reusing the existing catalog item — ordinary Darumaka's own level-35 Darmanitan evolution is unchanged", () => {
  assert.equal(getEvolutionItemEvolutionByItem("darumaka-galar", "ice-stone")?.evolvesToSpeciesId, "darmanitan-galar");
  assert.equal(getLevelEvolution("darumaka-galar"), undefined, "Galarian Darumaka must never also have a level evolution entry");
  assert.deepEqual(getLevelEvolution("darumaka"), { evolvesToSpeciesId: "darmanitan", requiredLevel: 35 }, "ordinary Darumaka's own threshold is unchanged");
});

test("Galarian Yamask -> Runerigus is a plain level-34 evolution (former take-damage/location condition dropped) — ordinary (Unova) Yamask's own Cofagrigus evolution is unchanged, and neither ordinary species gains the other's Galar-only target", () => {
  assert.deepEqual(getLevelEvolution("yamask-galar"), { evolvesToSpeciesId: "runerigus", requiredLevel: 34 });
  assert.deepEqual(getLevelEvolution("yamask"), { evolvesToSpeciesId: "cofagrigus", requiredLevel: 34 }, "ordinary Yamask's own threshold into Cofagrigus is unchanged");
  assert.equal(getLevelEvolution("runerigus"), undefined, "Runerigus is a final evolution");
});

test("ordinary (non-Galarian) forms never accidentally gain a Galar-only evolution: Meowth/Farfetch'd/Corsola/Yamask never evolve into Perrserker/Sirfetch'd/Cursola/Runerigus", () => {
  assert.notEqual(getLevelEvolution("meowth")?.evolvesToSpeciesId, "perrserker");
  assert.equal(getLevelEvolution("farfetchd"), undefined, "ordinary Farfetch'd must remain a standalone species with no evolution");
  assert.equal(getLevelEvolution("corsola"), undefined, "ordinary Corsola must remain a standalone species with no evolution");
  assert.notEqual(getLevelEvolution("yamask")?.evolvesToSpeciesId, "runerigus");
});

test("Galarian Forms use the exact live catalog ids — no Galarian source ever evolves into the Kantonian/Johto/Hoenn/Unova target, and vice versa", () => {
  const galarianFormLevelEvolutions: [string, string][] = [
    ["meowth-galar", "perrserker"],
    ["ponyta-galar", "rapidash-galar"],
    ["slowpoke-galar", "slowbro-galar"],
    ["farfetchd-galar", "sirfetchd"],
    ["mr-mime-galar", "mr-rime"],
    ["corsola-galar", "cursola"],
    ["zigzagoon-galar", "linoone-galar"],
    ["linoone-galar", "obstagoon"],
    ["yamask-galar", "runerigus"],
  ];
  for (const [speciesId, targetId] of galarianFormLevelEvolutions) {
    assert.equal(getLevelEvolution(speciesId)?.evolvesToSpeciesId, targetId, `${speciesId} -> ${targetId}`);
  }
});

test("Weezing, Galarian Weezing, Stunfisk, Galarian Stunfisk, and the three Galarian Legendary birds have no evolution of any kind", () => {
  for (const id of ["weezing", "weezing-galar", "stunfisk", "stunfisk-galar", "articuno-galar", "zapdos-galar", "moltres-galar"]) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
});

test("every genuinely standalone (non-evolving, non-legendary, non-fossil) Galar species has no evolution of any kind", () => {
  const standaloneIds = ["cramorant", "falinks", "stonjourner", "eiscue", "indeedee", "morpeko", "pincurchin", "duraludon"];
  for (const id of standaloneIds) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
});

test("the four fossil combinations (Dracozolt/Arctozolt/Dracovish/Arctovish) never evolve into or from one another, or anything else", () => {
  const fossilIds = ["dracozolt", "arctozolt", "dracovish", "arctovish"];
  for (const id of fossilIds) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
  for (const { evolution } of getAllLevelEvolutionEntries()) {
    assert.ok(!fossilIds.includes(evolution.evolvesToSpeciesId), `${evolution.evolvesToSpeciesId} is a fossil combination and must never be a level-evolution target`);
  }
});

test("every Galar legendary/mythical species has no evolution of any kind (Zacian, Zamazenta, Eternatus, Zarude, Regieleki, Regidrago, Glastrier, Spectrier, Calyrex)", () => {
  const legendaryIds = ["zacian", "zamazenta", "eternatus", "zarude", "regieleki", "regidrago", "glastrier", "spectrier", "calyrex"];
  for (const id of legendaryIds) {
    assert.equal(getLevelEvolution(id), undefined, `${id} must have no level evolution`);
    assert.deepEqual(getEvolutionItemEvolutions(id), [], `${id} must have no evolution-item evolution`);
    assert.equal(getBranchEvolution(id), undefined, `${id} must have no branch evolution`);
  }
  // Kubfu -> Urshifu is the one Galar "legendary" evolution that DOES exist
  // (LEVEL_EVOLUTIONS above) — Urshifu itself has no further evolution.
  assert.equal(getLevelEvolution("urshifu"), undefined, "Urshifu is a final evolution");
});

test("no Calyrex fusion/rider form (Ice Rider/Shadow Rider) or Gigantamax form appears anywhere in the evolution registry", () => {
  for (const fakeId of ["calyrex-ice", "calyrex-shadow", "calyrex-ice-rider", "calyrex-shadow-rider", "glastrier-fusion", "spectrier-fusion"]) {
    assert.equal(getLevelEvolution(fakeId), undefined);
    assert.deepEqual(getEvolutionItemEvolutions(fakeId), []);
    assert.equal(getBranchEvolution(fakeId), undefined);
  }
  for (const { evolution } of getAllLevelEvolutionEntries()) {
    assert.ok(!evolution.evolvesToSpeciesId.includes("calyrex-"), `${evolution.evolvesToSpeciesId} must never be a Calyrex fusion form`);
  }
});

test("no new evolution item was introduced for Galar: still exactly the same 16 EvolutionItemId values", () => {
  const canonicalIds = [
    "fire-stone", "water-stone", "thunder-stone", "leaf-stone", "sun-stone",
    "moon-stone", "ice-stone", "dawn-stone", "dusk-stone", "shiny-stone",
    "kings-rock", "metal-coat", "dragon-scale", "upgrade", "protector", "reaper-cloth",
  ];
  assert.equal(canonicalIds.length, 16);
  for (const itemId of canonicalIds) {
    assert.equal(isEvolutionItemId(itemId), true, `${itemId} must still be a recognized EvolutionItemId`);
  }
  for (const fakeGalarItem of ["tart-apple", "sweet-apple", "galarica-cuff", "galarica-wreath", "cracked-pot", "chipped-pot", "scroll-of-darkness", "scroll-of-waters"]) {
    assert.equal(isEvolutionItemId(fakeGalarItem), false, `${fakeGalarItem} must never be a recognized EvolutionItemId`);
  }
});

test("no duplicate evolution definitions: no Galar species is a key in more than one of LEVEL_EVOLUTIONS/BRANCH_EVOLUTIONS", () => {
  const galarSpeciesIds = POKEMON_DATA.filter((species) => species.dexNumber >= 810 && species.dexNumber <= 898 || species.formLabel === "Galarian Form").map(
    (species) => species.id
  );
  for (const speciesId of galarSpeciesIds) {
    const hasLevel = getLevelEvolution(speciesId) !== undefined;
    const hasBranch = getBranchEvolution(speciesId) !== undefined;
    assert.ok(!(hasLevel && hasBranch), `${speciesId} must not be a key in both LEVEL_EVOLUTIONS and BRANCH_EVOLUTIONS`);
  }
});

test("every Galar evolution target references a valid species id in the live catalog", () => {
  const speciesIds = new Set(POKEMON_DATA.map((species) => species.id));
  const galarSourceIds = [
    "grookey", "thwackey", "scorbunny", "raboot", "sobble", "drizzile", "skwovet", "rookidee", "corvisquire",
    "blipbug", "dottler", "nickit", "gossifleur", "wooloo", "chewtle", "yamper", "rolycoly", "carkol",
    "applin", "silicobra", "arrokuda", "toxel", "sizzlipede", "clobbopus", "sinistea", "hatenna", "hattrem",
    "impidimp", "morgrem", "milcery", "snom", "cufant", "dreepy", "drakloak", "kubfu",
    "meowth-galar", "ponyta-galar", "slowpoke-galar", "farfetchd-galar", "mr-mime-galar", "corsola-galar",
    "zigzagoon-galar", "linoone-galar", "darumaka-galar", "yamask-galar",
  ];

  for (const speciesId of galarSourceIds) {
    assert.ok(speciesIds.has(speciesId), `test assumption: ${speciesId} must exist in the catalog`);

    const levelEvolution = getLevelEvolution(speciesId);
    if (levelEvolution) {
      assert.ok(speciesIds.has(levelEvolution.evolvesToSpeciesId), `${levelEvolution.evolvesToSpeciesId} (level target of ${speciesId}) must be a valid species id`);
    }

    for (const itemEvolution of getEvolutionItemEvolutions(speciesId)) {
      assert.ok(speciesIds.has(itemEvolution.evolvesToSpeciesId), `${itemEvolution.evolvesToSpeciesId} (item target of ${speciesId}) must be a valid species id`);
      assert.ok(isEvolutionItemId(itemEvolution.itemId), `${itemEvolution.itemId} (item used by ${speciesId}) must be a recognized EvolutionItemId`);
    }

    const branchEvolution = getBranchEvolution(speciesId);
    if (branchEvolution) {
      for (const targetId of branchEvolution.targets) {
        assert.ok(speciesIds.has(targetId), `${targetId} (branch target of ${speciesId}) must be a valid species id`);
      }
    }
  }
});

// Counted explicitly: 33 new LEVEL_EVOLUTIONS entries keyed by a base Gen
// VIII species (grookey/thwackey/scorbunny/raboot/sobble/drizzile/skwovet/
// rookidee/corvisquire/blipbug/dottler/nickit/gossifleur/wooloo/chewtle/
// yamper/rolycoly/carkol/silicobra/arrokuda/toxel/sizzlipede/clobbopus/
// sinistea/hatenna/hattrem/impidimp/morgrem/snom/cufant/dreepy/drakloak/
// kubfu) + 9 Galarian-Form LEVEL_EVOLUTIONS entries (meowth-galar/
// ponyta-galar/slowpoke-galar/farfetchd-galar/mr-mime-galar/corsola-galar/
// zigzagoon-galar/linoone-galar/yamask-galar) = 42 total new
// LEVEL_EVOLUTIONS rows. Item evolutions: milcery (shiny-stone) +
// darumaka-galar (ice-stone) + slowpoke-galar (kings-rock) = 3 new
// EVOLUTION_ITEM_EVOLUTIONS rows. Branch evolutions: applin = 1 new
// BRANCH_EVOLUTIONS entry.
test("total evolution counts include exactly 42 new Galar level evolutions, 3 new Galar evolution-item evolutions, and 1 new Galar branch evolution", () => {
  const galarBaseLevelIds = [
    "grookey", "thwackey", "scorbunny", "raboot", "sobble", "drizzile", "skwovet", "rookidee", "corvisquire",
    "blipbug", "dottler", "nickit", "gossifleur", "wooloo", "chewtle", "yamper", "rolycoly", "carkol",
    "silicobra", "arrokuda", "toxel", "sizzlipede", "clobbopus", "sinistea", "hatenna", "hattrem",
    "impidimp", "morgrem", "snom", "cufant", "dreepy", "drakloak", "kubfu",
  ];
  const galarianFormLevelIds = [
    "meowth-galar", "ponyta-galar", "slowpoke-galar", "farfetchd-galar", "mr-mime-galar",
    "corsola-galar", "zigzagoon-galar", "linoone-galar", "yamask-galar",
  ];

  assert.equal(galarBaseLevelIds.length, 33);
  assert.equal(galarianFormLevelIds.length, 9);
  for (const id of [...galarBaseLevelIds, ...galarianFormLevelIds]) {
    assert.ok(getLevelEvolution(id), `${id} must have a level evolution entry`);
  }

  assert.equal(getEvolutionItemEvolutions("milcery").length, 1);
  assert.equal(getEvolutionItemEvolutions("darumaka-galar").length, 1);
  assert.equal(getEvolutionItemEvolutions("slowpoke-galar").length, 1);

  assert.ok(getBranchEvolution("applin"));
});

test("deriveSpeciesWildLevelRange across the entire catalog never produces minimumLevel > maximumLevel", () => {
  const invalid = POKEMON_DATA.filter((species) => {
    const range = deriveSpeciesWildLevelRange(species.id);
    return range.minimumLevel > range.maximumLevel;
  });
  assert.deepEqual(invalid.map((species) => species.id), []);
});
