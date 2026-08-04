// Focused regression tests for the evolution data tables (Level,
// Evolution-Item, Branch, Level-Stat) — deliberately small (per this
// phase's own "essential tests only" instruction): one test per rule that
// would silently break the feature, not exhaustive coverage of the whole
// species roster.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getLevelEvolution,
  getEvolutionItemEvolutionByItem,
  getEvolutionItemEvolutions,
  isEvolutionItemId,
  getBranchEvolution,
  getLevelStatEvolution,
  resolveLevelStatEvolutionTarget,
  resolvePendingEvolutionEligibility,
  isPendingEvolutionTargetValid,
} from "./pokemon-evolutions.ts";

test("a species evolves only with its own canonical item, never a different one", () => {
  assert.equal(getEvolutionItemEvolutionByItem("vulpix", "fire-stone")?.evolvesToSpeciesId, "ninetales");
  assert.equal(getEvolutionItemEvolutionByItem("vulpix", "water-stone"), undefined);
  assert.equal(getEvolutionItemEvolutionByItem("vulpix", "thunder-stone"), undefined);
  assert.equal(getEvolutionItemEvolutionByItem("vulpix", "leaf-stone"), undefined);
});

test("Eevee supports exactly its three canonical stone branches (Espeon/Umbreon are a Branch choice, not an item)", () => {
  const branches = getEvolutionItemEvolutions("eevee");
  const byItem = Object.fromEntries(branches.map((branch) => [branch.itemId, branch.evolvesToSpeciesId]));

  assert.equal(branches.length, 3);
  assert.equal(byItem["fire-stone"], "flareon");
  assert.equal(byItem["water-stone"], "vaporeon");
  assert.equal(byItem["thunder-stone"], "jolteon");
  assert.equal(getEvolutionItemEvolutionByItem("eevee", "leaf-stone"), undefined, "Eevee has no Leaf Stone branch");
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

test("isEvolutionItemId recognizes all nine canonical evolution-item ids, including the former Trade-item ones", () => {
  assert.equal(isEvolutionItemId("fire-stone"), true);
  assert.equal(isEvolutionItemId("water-stone"), true);
  assert.equal(isEvolutionItemId("thunder-stone"), true);
  assert.equal(isEvolutionItemId("leaf-stone"), true);
  assert.equal(isEvolutionItemId("sun-stone"), true);
  assert.equal(isEvolutionItemId("kings-rock"), true);
  assert.equal(isEvolutionItemId("metal-coat"), true);
  assert.equal(isEvolutionItemId("dragon-scale"), true);
  assert.equal(isEvolutionItemId("upgrade"), true);
  assert.equal(isEvolutionItemId("moon-stone"), false);
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

test("Eevee is an explicit level-16 Branch choice between Espeon and Umbreon, never automatic", () => {
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
