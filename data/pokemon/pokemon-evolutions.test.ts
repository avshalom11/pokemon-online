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
  const unovaDexRange = new Set(POKEMON_DATA.filter((species) => species.dexNumber >= 494 && species.dexNumber <= 649).map((species) => species.id));

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
